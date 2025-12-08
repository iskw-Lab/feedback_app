import sys
from flask import Flask, request, jsonify
import os
from dotenv import load_dotenv
load_dotenv(dotenv_path='.env.local')
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnableParallel, RunnablePassthrough
from langchain_community.retrievers import AzureAISearchRetriever
import re

# Flaskアプリケーションのインスタンスを作成
app = Flask(__name__)

if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OPENAI_API_KEYが.envファイルで見つかりません。")
if not os.getenv("AZURE_SEARCH_API_KEY"):
    raise ValueError("AZURE_SEARCH_API_KEYが.envファイルで見つかりません。")

# --- Azure AI Search設定（環境変数から取得） ---
azure_search_service_name = os.getenv("AZURE_AI_SEARCH_SERVICE_NAME")
azure_search_index_name = os.getenv("AZURE_AI_SEARCH_INDEX_NAME")
vector_store_password = os.getenv("AZURE_SEARCH_API_KEY")

if not azure_search_service_name:
    sys.exit("設定エラー: 環境変数 AZURE_AI_SEARCH_SERVICE_NAME が設定されていません。")
        
if not azure_search_index_name:
    sys.exit("設定エラー: 環境変数 AZURE_AI_SEARCH_INDEX_NAME が設定されていません。")
        
if not vector_store_password:
    sys.exit("設定エラー: 環境変数 AZURE_SEARCH_API_KEY が設定されていません。")

AzureAIRetriever = AzureAISearchRetriever(
    service_name=azure_search_service_name,
    api_key=vector_store_password,
    api_version='2024-07-01',
    index_name=azure_search_index_name,
    content_key='description',
    top_k=3,
)

chatmodel = ChatOpenAI(temperature=0, model="gpt-5-mini")
output_parser = StrOutputParser()

ICF_ABSTRACTION_TEMPLATE = """あなたは，優秀な care professionalです．さまざまな介護ケアプランに対して，ケアプランの内容を解釈することをサポートしてください．

Instructions:
1. "身体構造（body structures）", "心身機能（body functions）", "活動（activity）", "参加（participation）"， "環境因子（environmental factors）"， "個人因子（personal factors）"に関連させて，inputされた情報を抽象化してその特徴を表現してください．
2. 「身体構造」のように抽象化しすぎてはいけません．Examplesを参考にして，必ずabstractionタグを付与してください．
3. 支援者視点(second-person view)ではなく個人視点(first-person view)で回答してください．例えば，「協力が得られない」等の表現は支援者の視点からの抽象化です．どういう参加・活動の能力があるのか/ないのか，どんな身体的・精神的・心理的機能があるのか/ないのか，どんな環境に置かれているのかを表してください．
4. 精神症状，介護アセスメント情報，パーソナル情報は，以下の項目を参照し，病名は（身体構造）としてキーワードをabstractionに含めてください．
5. 入力された情報には，①，②のようにナンバリングされた情報が含まれています。それぞれの番号ごとに分けて、個別にabstractionタグを付与して生成してください。
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

Input: {input}"""

ICF_LABELING_TEMPLATE = """あなたは，ICF(International Classification of Functioning, Disability and Health)の優秀なアノテータです．さまざまな介護ケアプランに対して，ICFコードをアノテーション（タグづけ）することをサポートしてください．

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

# --- LangChainのチェーンを定義 ---
prompt_icf_abstraction = PromptTemplate.from_template(ICF_ABSTRACTION_TEMPLATE)
chain_icf_abstraction = prompt_icf_abstraction | chatmodel | output_parser

prompt_code = PromptTemplate.from_template(ICF_LABELING_TEMPLATE)
setup_and_retrieval = RunnableParallel({"context": AzureAIRetriever, "sentence": RunnablePassthrough()})
chain_code = setup_and_retrieval | prompt_code | chatmodel | output_parser

# --- APIのエンドポイントを定義 ---
@app.route('/api/tag_icf', methods=['POST'])
def handler():
    try:
        req_data = request.get_json()
        careplan_text = req_data.get('careplan')

        if not careplan_text:
            return jsonify({"error": "careplan text is required"}), 400

        # 1. 受け取ったテキストをカンマで分割し、リストにする
        individual_plans = [plan.strip() for plan in careplan_text.split(',') if plan.strip()]
        
        tagged_plans = []

        # 2. 分割した各プランをループで処理する
        for plan_item in individual_plans:
            # ステップA: 個々のプランを抽象化
            abstraction_result = chain_icf_abstraction.invoke({"input": plan_item})
            
            # 抽象化されたテキストを抽出 (1つだけ返されることを期待)
            match = re.search(r'abstraction:\s*(.*)', abstraction_result)
            
            if match:
                extracted_abstraction = match.group(1).strip()
                
                # ステップB: 抽象化されたテキストにICFコードをタグ付け
                icf_code_result = chain_code.invoke(extracted_abstraction)
                
                # 結果を整形してリストに追加
                icf_codes = [code.strip() for code in icf_code_result.split(',') if code.strip()]
                
                tagged_plans.append({
                    "plan": plan_item, # 抽象化されたテキストをplanとして保存
                    "icf_codes": icf_codes
                })
        
        # 3. 全ての処理結果をまとめて返す
        return jsonify({"careplan_icf": tagged_plans})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Vercelで実行するためのエントリーポイント
# ローカルで `python api/tag_icf.py` を実行してもテスト可能
if __name__ == "__main__":
    app.run(port=5328)