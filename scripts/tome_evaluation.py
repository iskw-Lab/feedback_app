import os
import sys
import pandas as pd
import re
import json
import asyncio
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableParallel, RunnablePassthrough
from langchain.prompts.prompt import PromptTemplate
from langchain_experimental.data_anonymizer import PresidioReversibleAnonymizer
from langchain_community.retrievers import AzureAISearchRetriever

import spacy
import spacy_curated_transformers

# --- 定数と設定 ---
# (プロンプトテンプレートは変更しない)
PERSONALITY_ABSTRACTION_TEMPLATE = """あなたは，優秀な care professionalです．さまざまな介護記録情報に対して，記録情報の内容を解釈することをサポートしてください．

[Instructions]
1. inputされた情報を，以下のTagの項目に関連する情報をextractしてください．
2. extractされた情報にTagを付与し，その内容を要約してください．
3. extractする情報は利用者（対象者）の発言だけにしてください．
4. extractできる利用者の発言がない場合は「該当なし」と回答し，Tagは選択しないでください．
5. extractされた情報から分類できるTagがない場合は，「該当なし」と回答してください．
6. Tag一つにつき，一つの回答を生成してください．
7. 出力結果はExampleを例に一貫した回答を常に生成してください．
8. 解釈や要点, 対応ポイントなど指示されてないものは一切回答しないでください.
9. 指示された出力形式に厳密に従ってください.
10. あなたの応答は、必ず "output: " という接頭辞から始めてください。

[Expamples]
input:昔畑で野菜を作っていたそうで、野菜をじっくり眺めている, extract:畑で野菜を作っていた, output: (趣味)「野菜を作っていた」とのことで野菜作りが趣味であった
input:棚の建て付けを見て、「これ直してやろうか」とのこと, extract:棚の建て付けを見て、「これ直してやろうか」, output: (得意なこと)「これ直してやろうか」との発言があり棚の建て付けが得意である

[Tag]
趣味，嗜好，好きなもの，好きなこと，嫌いなもの，嫌いなこと，身だしなみ，色の好み，好きなメディア，なじみのもの，得意なこと，苦手なこと，好む話，好まない話，信仰，尊敬する人，動物の好き嫌い

[Input]{input}"""

ICF_ABSTRACTION_TEMPLATE = """あなたは，優秀な care professionalです．さまざまな介護記録情報に対して，記録情報の内容を解釈することをサポートしてください．

Instructions:
1. "身体構造（body structures）", "心身機能（body functions）", "活動（activity）", "参加（participation）"， "環境因子（environmental factors）"， "個人因子（personal factors）"に関連させて，inputされた情報を抽象化してその特徴を表現してください．
2. 「身体構造」のように抽象化しすぎてはいけません．Examplesを参考にして，必ずabstractionタグを付与してください．
3. 支援者視点(second-person view)ではなく個人視点(first-person view)で回答してください．例えば，「協力が得られない」等の表現は支援者の視点からの抽象化です．どういう参加・活動の能力があるのか/ないのか，どんな身体的・精神的・心理的機能があるのか/ないのか，どんな環境に置かれているのかを表してください．
4. 精神症状，介護アセスメント情報，パーソナル情報は，以下の項目を参照し，病名は（身体構造）としてキーワードをabstractionに含めてください．

6. 出力結果は40文字以内で回答してください．
7. 出力結果は一貫した回答を常に生成してください．
8. 回答は日本でお願いします．
9. 指示された出力形式に厳密に従ってください.
10. 解釈や要点, 対応ポイントなど指示されてないものは一切回答しないでください.

Examples:
input:馴染みの人に相談できる，abstraction:（対人関係）相談できる知り合いが周りにいるという環境要因がある,
input:階段60段登れていた, abstraction:（歩行）昇り降りして移動する身体的な能力がある,
input:知り合いのボランティアとは笑顔で会話可能, abstraction:（参加）周囲の人と基本的なコミュニケーションに参加することができる,
input:当初声掛けが必要だったトイレ動作は自立できた, abstraction:（排泄）排泄の計画と遂行を自立的に活動することが可能,
input:運動の誘いを拒否, abstraction:（運動）モチベーションが低くく活力が低下している,
input:包括支援センターの介入, abstraction:（介護保険）健康的なライフスタイルを促進することに関するサービス,
input:周囲への関心低下, abstraction:（対人関係）対人的技能の形成につながる精神機能,
input:セルフケアは声掛け必要,abstraction:（活動）セルフケア全般のレベル
input:アルツハイマー病の診断あり,abstraction:（身体構造）脳機能に障害がある
input:熱いお風呂が好き,abstraction:（嗜好）熱いお風呂が好き

精神症状（ICFの心身機能）：
不安，抑うつ，幻覚，妄想，不眠，食欲不振，過眠，不眠，途中覚醒，早朝覚醒，多動，不潔行為，暴言，徘徊，暴力，衝動，焦燥感，いらいら，不穏，躁状態，帰宅願望，意欲の低下，無気力

介護アセスメント情報（ICFの活動）：
食事，排泄，入浴，更衣，整容，歩行，移乗，立位，座位，寝返り，トイレ動作

基本情報（ICFの参加，環境因子）：
家族構成，職歴，病歴，生活歴，病名，飲酒，喫煙，家事，対人関係

パーソナル情報（ICFの個人因子）：
趣味，性格・気質・人格，習慣，嗜好，身だしなみ，色の好み，好きなメディア，なじみのもの，得意なこと，苦手なこと，好む話，好まない話，信仰，尊敬する人，動物の好き嫌い，健康法

Input: {input}

[Output Format]
あなたの応答は、必ず "abstraction: " という接頭辞から始めてください。
複数の抽象化が可能な場合は、それぞれ改行して "abstraction: " から始めてください。
抽象化する内容がない場合は、"abstraction: 該当なし" とだけ応答してください。

abstraction: (抽象化された内容1)
abstraction: (抽象化された内容2)
"""

LIFE_ABSTRACTION_TEMPLATE = """あなたは，優秀な care professionalです．さまざまな介護記録情報に対して，記録情報の内容を解釈することをサポートしてください．

[Instructions]
1. inputされた情報を，以下のTagの項目に分類してextractし，その内容を要約してください．
2. extractする情報は利用者（対象者）の発話や行動としてください．
3. 分類できるTagがない場合は，「該当なし」と回答してください．
4. Tag一つにつき，一つの回答を生成してください．
5. 出力結果はExampleを例に「output:」を必ず入れて，一貫した回答を常に生成してください．
6. 指示された出力形式に厳密に従ってください.
7. 解釈や要点, 対応ポイントなど指示されてないものは一切回答しないでください.

[Expamples]
input:洗濯干しもされ、発汗あり、「着替えて汗拭こう」とあるため 清拭の声かけをする。背中を拭くと気持ち良い~とあり。, extract:洗濯干しもされ, output: (IADL)家事（洗濯干し）をされる
input:洗濯干しもされ、発汗あり、「着替えて汗拭こう」とあるため 清拭の声かけをする。背中を拭くと気持ち良い~とあり。, extract:「着替えて汗拭こう」とあるため 清拭の声かけをする。背中を拭くと気持ち良い~とあり, output: (人柄・嗜好)汗を流して清潔にすることに対して好意的な態度
input:買物に使っている レンタルのカートを持参すれば散歩も途中で座われるし、楽なのでは?と提案するが断わっている。, extract:該当なし, output: 該当なし

[Tag]
医療情報・心身状況：病気や疾病が原因となっている身体や心的な状態
医療情報・現病歴：現在の病気や疾病の状況
医療情報・既往歴：過去の病気や疾病の状況
暮らし・思い出の場所：利用者が思い出に残る場所，故郷，旅行先など
暮らし・交流関係：利用者の交友関係，友人，家族，知人などとの人間関係
暮らし・施設やサービス：利用者が利用している身の回りのお店，施設やサービス
暮らし・教育歴：利用者の学歴，学校，教育機関
暮らし・職歴：利用者の職歴，職場，職業
人柄・性格：利用者の性格，気質，人格，人柄
人柄・嗜好：利用者の好み，趣味，嗜好，好きなもの，嫌いなもの，身だしなみ，色の好み，好きなメディア，なじみのもの，得意なこと，苦手なこと，好む話，好まない話，信仰，尊敬する人，動物の好き嫌い，
人柄・習慣：利用者が毎日，もしくは，定期的に続けていること，健康法
人柄・癖：利用者の癖で気をつけること，注意すること
BADL：歩行，移乗，食事，入浴，更衣，排泄，整容，立位，座位，寝返り，トイレ動作，コミュニケーション，社会認識
IADL：家事（料理，洗濯，掃除，配膳，食器洗い），電話，服薬管理，買い物，交通機関の利用，金銭管理

[Input]{input}"""

EMOTION_TEMPLATE = """あなたは感情分析の専門家です。inputされた文章に対して感情を評価してください．

Instruction:
1. inputの文章に対して、それぞれの形成的な評価として，感情（喜び，感謝，安らぎ，愛，興味，愉快，希望，悲しみ，驚き，怒り，嫌悪，恐怖，軽蔑，ニュートラル）を評価し，総括的評価（summative）として，ポジティブ，ネガティブ，ニュートラルに分類してください．
2. Exampleと同様の形式で出力してください．
3. 感情は，joy,thankfulness,relaxation,love,interest,pleasure,hope,sadness,surprise,anger,disgust,fear,contempt,neutralの13種類の感情の割合を計算し，それぞれの感情が文章に対してどの程度の割合を占めるかを示してください．
4. 感情の評価は，例えば，joy：0.2，sadness：0.1，のように評価し，合計が1.0になるようにしてください．
5. 感情の評価結果に基づき，文章の総合的な感情をポジティブ，ネガティブ，ニュートラルのいずれかに分類してください．
6. 出力結果はExampleを例に一貫した回答を常に生成し，一つの感情を生成してください．
7. 指示された出力形式に厳密に従ってください.
8. 解釈や要点, 対応ポイントなど指示されてないものは一切回答しないでください.

Example:
input:あの、お化粧しないと鏡見ないからね。しんどいときはね、ほんと姿見ないときあるんですよ。でも娘たちの存在が大きいですよ, emotion:joy：0.0，thankfulness：0.0，relaxation：0.0，love：0.0，interest：0.0，pleasure：0.0，hope：0.4，sadness：0.6，surprise：0.0，anger：0.0，disgust：0.0，fear：0.0，contempt：0.0，neutral：0.0, summative:negative
input:隣の席の石川さんと談笑していた, emotion:joy：1.0，thankfulness：0.0，relaxation：0.0，love：0.0，interest：0.0，pleasure：0.0，hope：0.0，sadness：0.0，surprise：0.0，anger：0.0，disgust：0.0，fear：0.0，contempt：0.0，neutral：0.0, summative:positive

Input: {input}"""

Speech_TEMPLATE = """あなたは，優秀な care professionalです．さまざまな介護記録情報に対して，記録情報の内容を解釈することをサポートしてください．

[Instructions]
1. 利用者の発言に関する情報に[発言」というTagを付与してください．
2. Tagを付与する対象は利用者（対象者）の発言だけにしてください．
3. 利用者の発言がない場合は「該当なし」と回答してください．
4. Tag一つにつき，一つの回答を生成してください．
5. 利用者の発話は"「"や"『"で始まり，"」"や"』"で終わる文章です．
6. 指示された出力形式に厳密に従ってください.
7. 解釈や要点, 対応ポイントなど指示されてないものは一切回答しないでください.

[Input]{input}"""

ICF_LABELING_TEMPLATE = """あなたは，ICF(International Classification of Functioning, Disability and Health)の優秀なアノテータです．さまざまな介護記録情報に対して，ICFコードをアノテーション（タグづけ）することをサポートしてください．

Instructions:
1. ICFコードを回答してください.
2. ICFコードは基本的に３桁（例えばd570, e310）で回答してください．
3. 尤も当てはまる「一つのコード」に分類してください．
4. Contextの情報を参考に最も適切なICFコードを特定してください．
5. 出力結果は，ICFコードのみで，一貫した回答を常に生成してください．
6. 解説、前置き、会話的な文章は一切含めないでください.
7. 指示された出力形式に厳密に従ってください.
8. 解釈や要点, 対応ポイントなど指示されてないものは一切回答しないでください.

Context: {context}

Sentence: {sentence}"""

# --- ★ メイン実行関数 (非同期) ★ ---
async def main(input_csv_path, output_json_path):
    """
    単一のCSVファイルを非同期バッチ処理し、単一のJSONとして保存する
    """
    try:
        # --- 1. 環境変数とモデルの読み込み ---
        print("--- 1. 環境変数とモデルの読み込み ---", file=sys.stderr) ### DEBUG ###
        openai_api_key = os.environ.get("OPENAI_API_KEY")
        azure_search_service = os.environ.get("AZURE_AI_SEARCH_SERVICE_NAME")
        azure_search_key = os.environ.get("AZURE_SEARCH_API_KEY")
        azure_search_index = os.environ.get("AZURE_AI_SEARCH_INDEX_NAME")
        if not all([openai_api_key, azure_search_service, azure_search_key, azure_search_index]):
            raise ValueError("必要な環境変数 (OPENAI_API_KEY, AZURE_AI...) が設定されていません。")

        try:
            nlp = spacy.load("ja_core_news_trf")
            print("Spacyモデル 'ja_core_news_trf' の読み込み完了。", file=sys.stderr) ### DEBUG ###
        except OSError:
            print("エラー: Spacyモデル 'ja_core_news_trf' が見つかりません。", file=sys.stderr)
            sys.exit(1)

        # --- 2. LangChainコンポーネントの設定 ---
        print("--- 2. LangChainコンポーネントの設定 ---", file=sys.stderr) ### DEBUG ###
        chatmodel = ChatOpenAI(temperature=1, model="gpt-5-mini", api_key=openai_api_key)
        output_parser = StrOutputParser()

        azure_retriever = AzureAISearchRetriever(
            service_name=azure_search_service, api_key=azure_search_key,
            index_name=azure_search_index, content_key='description', top_k=3
        )
        nlp_config = {
            "nlp_engine_name": "spacy",
            "models": [{"lang_code": "ja", "model_name": "ja_core_news_trf"}],
        }
        anonymizer = PresidioReversibleAnonymizer(
            analyzed_fields=["PERSON", "LOCATION"], languages_config=nlp_config
        )

        # Chains
        chains = {
            "speech": PromptTemplate.from_template(Speech_TEMPLATE) | chatmodel | output_parser,
            "personality": PromptTemplate.from_template(PERSONALITY_ABSTRACTION_TEMPLATE) | chatmodel | output_parser,
            "icf_abstraction": PromptTemplate.from_template(ICF_ABSTRACTION_TEMPLATE) | chatmodel | output_parser,
            "emotion": PromptTemplate.from_template(EMOTION_TEMPLATE) | chatmodel | output_parser,
            "code": RunnableParallel({"context": azure_retriever, "sentence": RunnablePassthrough()})
                    | PromptTemplate.from_template(ICF_LABELING_TEMPLATE)
                    | chatmodel
                    | output_parser
        }

        # --- 3. CSVファイルの読み込み ---
        print(f"--- 3. CSVファイルの読み込み ({input_csv_path}) ---", file=sys.stderr) ### DEBUG ###
        try:
            df = pd.read_csv(input_csv_path, encoding='utf-8-sig')
        except UnicodeDecodeError:
            df = pd.read_csv(input_csv_path, encoding='cp932')
        except Exception as e:
            print(f"エラー: CSVファイルの読み込みに失敗しました。詳細: {e}", file=sys.stderr)
            sys.exit(1)

        if '内容' not in df.columns:
            raise KeyError("CSVファイルに '内容' 列が見つかりません。")

        print(f"読み込み完了: {len(df)} 行", file=sys.stderr) ### DEBUG ###

        # --- 4. 匿名化処理 ---
        print(f"--- 4. 匿名化処理 ({len(df)}行) ---", file=sys.stderr) ### DEBUG ###
        anonymized_contents = []
        for content in df['内容']:
            safe_content = str(content) if pd.notna(content) else ""
            anonymized_contents.append(anonymizer.anonymize(safe_content, language="ja"))
        df['anonymized_content'] = anonymized_contents
        print("匿名化完了", file=sys.stderr) ### DEBUG ###

        # --- 5. 各LLMチェーンの実行 (非同期バッチ) ---
        print("--- 5. LLMチェーンの実行 (非同期バッチ) ---", file=sys.stderr) ### DEBUG ###
        results = {}
        anon_inputs = [{"input": str(c)} for c in df['anonymized_content']]

        # 5-1. 発話抽出 (Speech)
        print("   5-1. 発話抽出 実行中...", file=sys.stderr) ### DEBUG ###
        raw_outputs_speech = await chains['speech'].abatch(anon_inputs)
        speech_outputs = [re.sub(r'^output:\s*', '', o, flags=re.IGNORECASE).strip() or None for o in raw_outputs_speech]
        results['speech'] = speech_outputs
        print("   発話抽出 完了", file=sys.stderr) ### DEBUG ###

        # 5-2. パーソナル情報抽象化 (Personality)
        
        print("   5-2. パーソナル情報抽象化 実行中...", file=sys.stderr) ### DEBUG ###
        personality_outputs = []
        raw_outputs_pers = await chains['personality'].abatch(anon_inputs)
        for output in raw_outputs_pers:
            matches = re.findall(r'output:\s*\((.*?)\)\s*(.*)', output, flags=re.IGNORECASE)
            personality_outputs.append([f"({tag.strip()}){text.strip()}" for tag, text in matches] if matches else [])
        max_person = max(len(p) for p in personality_outputs) if personality_outputs else 0
        person_data = {f'person{j+1}': [p[j] if j < len(p) else None for p in personality_outputs] for j in range(max_person)}
        results['personality'] = pd.DataFrame(person_data, index=df.index)
        print("   パーソナル情報抽象化 完了", file=sys.stderr) ### DEBUG ###

        # 5-3. ICF抽象化 (ICF Abstraction)
        print("   5-3. ICF抽象化 実行中...", file=sys.stderr) ### DEBUG ###
        raw_outputs_icf_abst = await chains['icf_abstraction'].abatch(anon_inputs)
        icf_abstraction_outputs = []
        
        # ▼▼▼【ここを差し替え】▼▼▼
        for output in raw_outputs_icf_abst:
            # 1. まず、指示通り 'abstraction:' を探す
            inner_matches = re.findall(r'abstraction:\s*(.*?)(?=\n|$)', output, re.IGNORECASE)
            
            # 2. もし 'abstraction:' が見つからなければ、LLMが指示を無視したと仮定し、
            #    プロンプトのExamples ('(趣味)「野菜を〜」') を参考に、
            #    '(カテゴリ) 内容' の形式の行を強引に抽出する。
            if not inner_matches:
                # ^\s* -> 行頭（と任意の空白）
                # \((.*?)\)  -> (カテゴリ)
                # \s*(.*?) -> 内容
                # (?=\n|$) -> 行末または文字列末尾まで
                fallback_matches = re.findall(r'^\s*\((.*?)\)\s*(.*?)(?=\n|$)', output, re.MULTILINE)
                
                # findall はタプルのリスト [('睡眠', '良眠'), ('排泄', '夜間1回')] を返すため、
                # '(睡眠) 良眠' の形式の文字列リストに再結合する
                inner_matches = [f"({m[0].strip()}) {m[1].strip()}" for m in fallback_matches]

            # "該当なし" のような不要なマッチや空文字列を除外
            valid_matches = [
                m.strip() for m in inner_matches if m.strip() and "該当なし" not in m
            ]

            if valid_matches:
                icf_abstraction_outputs.append(valid_matches)
            else:
                icf_abstraction_outputs.append([])
        # ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
        
        max_icf_abst = max(len(icf) for icf in icf_abstraction_outputs) if icf_abstraction_outputs else 0
        icf_abst_data = {f'icf_abst{j+1}': [icf[j] if j < len(icf) else None for icf in icf_abstraction_outputs] for j in range(max_icf_abst)}
        results['icf_abstraction'] = pd.DataFrame(icf_abst_data, index=df.index)


        # 5-4. 感情分析 (Emotion)
        print("   5-4. 感情分析 実行中...", file=sys.stderr) ### DEBUG ###
        raw_outputs_emotion = await chains['emotion'].abatch(anon_inputs)
        emotion_outputs = []
        for output in raw_outputs_emotion:
            match = re.search(r'summative:\s*(positive|negative|neutral)', output, re.IGNORECASE)
            emotion_outputs.append(match.group(1).lower() if match else "neutral")

        results['emotion'] = pd.DataFrame({'emotion1': emotion_outputs}, index=df.index)
        print("   感情分析 完了", file=sys.stderr) ### DEBUG ###

        # 5-5. ICFラベリング (ICF Labeling) - 5-3の結果を使用
        print("   5-5. ICFラベリング 実行中...", file=sys.stderr) ### DEBUG ###
        df_icf_abst = results['icf_abstraction']
        icf_abst_cols = [col for col in df_icf_abst.columns if col.startswith('icf_abst')]

        tasks = []
        for i, row in df_icf_abst.iterrows():
            for col_idx, col_name in enumerate(icf_abst_cols):
                abst_text = row[col_name]
                if pd.notna(abst_text) and str(abst_text).strip():
                    tasks.append((i, f'icf{col_idx+1}', str(abst_text)))

        print(f"### DEBUG ### ICFラベリング 入力タスク数: {len(tasks)}", file=sys.stderr) ### DEBUG ###
        if tasks:
             print(f"### DEBUG ### ICFラベリング 入力タスク (最初の5件): {tasks[:5]}", file=sys.stderr) ### DEBUG ###


        icf_labeling_results_df = pd.DataFrame(index=df.index)
        if tasks:
            # processed_codes_map を使わず、DataFrameに直接書き込む
            
            print(f"### DEBUG ### ICFラベリング 逐次実行開始 (タスク数: {len(tasks)})", file=sys.stderr) ### DEBUG ###
            
            try:
                for (row_index, col_key, abst_text) in tasks:
                    # 1件ずつチェーンを実行
                    icf_code = await chains['code'].ainvoke(abst_text)
                    
                    print(f"### DEBUG ### [ICF Raw Output] {icf_code}", file=sys.stderr)

                    # 1件ずつパース
                    code_match = re.search(r'([a-z]\d{3})', icf_code, re.IGNORECASE)
                    processed_code = code_match.group(1).lower() if code_match else None
                    
                    if processed_code:
                        # (A) この列が初めてか確認
                        if col_key not in icf_labeling_results_df.columns:
                            # (B) 列を `dtype='object'` で作成（indexはdf.indexと自動で揃う）
                            icf_labeling_results_df[col_key] = pd.Series(dtype='object')
                        
                        # (C) .loc を使って、正しい行インデックスと列名に値を設定
                        icf_labeling_results_df.loc[row_index, col_key] = processed_code
                         
                print(f"### DEBUG ### ICFラベリング 逐次実行完了", file=sys.stderr) ### DEBUG ###
                
                # (D) 処理後のDataFrameの状態をデバッグ
                print(f"### DEBUG ### ICF DFは空か？: {icf_labeling_results_df.empty}", file=sys.stderr)
                print(f"### DEBUG ### ICF DFの列名: {icf_labeling_results_df.columns.tolist()}", file=sys.stderr)


            except Exception as invoke_error:
                print(f"   警告: ICFラベリングの逐次実行中にエラー: {invoke_error}", file=sys.stderr)
            # ▲▲▲【ここまで修正】▲▲▲
        else:
             print("### DEBUG ### ICFラベリング対象なし", file=sys.stderr) ### DEBUG ###

        results['icf_labeling'] = icf_labeling_results_df
        print("   ICFラベリング 完了", file=sys.stderr) ### DEBUG ###
        print("### DEBUG ### ICFラベリング 結果DataFrame (最初の5行):", file=sys.stderr) ### DEBUG ###
        print(results['icf_labeling'].head().to_string(), file=sys.stderr) ### DEBUG ###
        # ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        # --- 6. 元データと分析結果の結合 ---
        print("--- 6. 結果の結合 ---", file=sys.stderr) ### DEBUG ###
        df_final = df.drop(columns=['anonymized_content'])
        df_final['speech'] = results['speech']

        if 'personality' in results and not results['personality'].empty:
             df_final = pd.concat([df_final, results['personality']], axis=1)

        df_final = pd.concat([df_final, results['emotion']], axis=1)

        # ICF抽象化の中間結果は結合しない

        if 'icf_labeling' in results and not results['icf_labeling'].empty:
            df_final = pd.concat([df_final, results['icf_labeling']], axis=1)
        print(f"### DEBUG ### 結合後の列名: {df_final.columns.tolist()}", file=sys.stderr) ### DEBUG ###
        # ICF列が存在するか確認
        icf_cols_in_final = [col for col in df_final.columns if col.startswith('icf')]
        if icf_cols_in_final:
             print("### DEBUG ### 結合後DataFrameのICF列 (最初の5行):", file=sys.stderr) ### DEBUG ###
             print(df_final[icf_cols_in_final].head().to_string(), file=sys.stderr) ### DEBUG ###
        else:
             print("### DEBUG ### 結合後DataFrameにICF列が存在しません", file=sys.stderr) ### DEBUG ###

        # --- 7. JSON形式に変換 ---
        print("--- 7. JSON形式への変換 ---", file=sys.stderr) ### DEBUG ###
        is_shokibo = False
        if 'フロア名' in df_final.columns and not df_final.empty:
            # 最初の行のフロア名で判定（全ての行が同じフロアと仮定）
            first_floor_name = df_final['フロア名'].iloc[0]
            if first_floor_name == "小規模多機能": # ★ "小規模多機能" かチェック
                is_shokibo = True
                print("### DEBUG ### フロア名が '小規模多機能' のため、部屋名列を削除します。", file=sys.stderr)
                if '部屋名' in df_final.columns:
                    df_final = df_final.drop(columns=['部屋名']) # ★ 部屋名列を削除
                    print("### DEBUG ### 部屋名列を削除しました。", file=sys.stderr)
                else:
                    print("### DEBUG ### 部屋名列は存在しませんでした。", file=sys.stderr)

        # NaN/NaT を None に変換
        df_final = df_final.where(pd.notna(df_final), None)
        json_data = df_final.to_dict(orient='records')

        # --- 8. JSONファイルとして保存 ---
        print(f"--- 8. JSONファイル保存 ({output_json_path}) ---", file=sys.stderr) ### DEBUG ###
        output_dir = os.path.dirname(output_json_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        with open(output_json_path, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, ensure_ascii=False, indent=2)

        print(f"JSONファイルの保存完了。", file=sys.stderr) ### DEBUG ###
        # ★★★ stdoutにはファイルパスのみを出力 ★★★
        print(os.path.abspath(output_json_path))

    except (FileNotFoundError, KeyError, ValueError) as e:
        print(f"エラー: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"予期せぬエラーが発生しました: {e}", file=sys.stderr)
        sys.exit(1)

# --- スクリプト実行部分 ---
if __name__ == "__main__":
    if len(sys.argv) > 2:
        input_path = sys.argv[1]
        output_path = sys.argv[2]  # ★ Node.jsから渡されたフルパスをそのまま使う

        # デバッグログ（Node.jsのコンソールで見えるようにstderrに出力）
        print(f"Python実行開始: {sys.argv[0]}", file=sys.stderr)
        print(f"  入力CSV: {input_path}", file=sys.stderr)
        print(f"  出力JSON: {output_path}", file=sys.stderr)

        # メイン処理を実行
        # ※ main関数の中で output_path に向かって保存するように実装されている必要があります
        asyncio.run(main(input_path, output_path))
        
    else:
        print("エラー: 入力CSVファイルパスと出力JSONファイルパスが必要です。", file=sys.stderr)
        print("使用法: python tome_evaluation.py <input_csv_path> <output_json_path>", file=sys.stderr)
        sys.exit(1)