import pandas as pd
import os
import sys

def delete_rows_by_keyword(df, keywords, keyword_column_name):
    """
    指定された列の値を基に、キーワードに一致する行を削除する関数。
    削除後のデータフレームを返す。
    """
    print(f"「{keyword_column_name}」列の単語が {keywords} と一致する行を削除します。", file=sys.stderr)
    print("-" * 30, file=sys.stderr)
    print("元のデータ:", file=sys.stderr)
    print(df.head(), file=sys.stderr) # 長い場合に備えて先頭5行のみ表示
    print("-" * 30, file=sys.stderr)

    df_modified = df[~df[keyword_column_name].isin(keywords)]

    print("行削除後のデータ:", file=sys.stderr)
    print(df_modified.head(), file=sys.stderr) # 長い場合に備えて先頭5行のみ表示
    print("-" * 30, file=sys.stderr)

    return df_modified


# --- メインの処理 ---
def main(input_csv_path):
    output_dir = os.path.dirname(input_csv_path)
    base, ext = os.path.splitext(os.path.basename(input_csv_path))
    temp_processed_base = os.path.join(output_dir, f"{base}_processed_temp")
    KEYWORD_COLUMN = "分類"
    keywords_to_use = ["業務日誌", "リハビリ", "モニタリング", "ヒヤリ・トラブル報告"]
    created_files = [] # 生成されたファイルのパスを保存

    try:
        if not os.path.exists(input_csv_path):
            raise FileNotFoundError(f"エラー: ファイル '{input_csv_path}' が見つかりません。")

        # --- ★★★ errors='ignore' を削除し、基本的な try-except に戻す ★★★ ---
        encodings_to_try = ['utf-8', 'cp932', 'shift_jis', 'euc_jp']
        main_df = None
        detected_encoding = None

        for enc in encodings_to_try:
            try:
                # errors='ignore' を使わずに読み込みを試す
                main_df = pd.read_csv(input_csv_path, encoding=enc)
                detected_encoding = enc
                print(f"CSVファイルを {detected_encoding} で読み込みました。", file=sys.stderr)
                break # 読み込めたらループを抜ける
            except UnicodeDecodeError:
                print(f"{enc} での読み込みに失敗しました。次のエンコーディングを試します...", file=sys.stderr)
                continue # 次のエンコーディングへ
            except Exception as e:
                 # 予期せぬエラーはここで捕捉し、エラーメッセージを具体的にする
                 print(f"{enc} での読み込み中に予期せぬエラーが発生しました: {e}", file=sys.stderr)
                 # 他のエンコーディングも試すために続ける
                 continue

        if main_df is None:
            # すべてのエンコーディングで失敗した場合
            raise Exception(f"CSVファイルの読み込みに失敗しました。サポートされている文字コード ({', '.join(encodings_to_try)}) ではないか、ファイルが破損している可能性があります。")
        # --- ★★★ ここまで文字コード処理を変更 ★★★ ---


        if KEYWORD_COLUMN not in main_df.columns:
            raise KeyError(f"エラー: キーワード列 '{KEYWORD_COLUMN}' がCSV内に見つかりません。")

        cleaned_df = delete_rows_by_keyword(main_df, keywords_to_use, KEYWORD_COLUMN)

        floor_column_name = None
        for col in cleaned_df.columns:
            if col.startswith("フロア名"):
                floor_column_name = col
                break

        if floor_column_name:
            print(f"分割キーとして列「{floor_column_name}」を使用します。", file=sys.stderr)
            unique_floors = cleaned_df[floor_column_name].dropna().unique()
            for floor in unique_floors:
                floor_df = cleaned_df[cleaned_df[floor_column_name] == floor]
                new_output_filename = f"{temp_processed_base}_{floor}{ext}"
                # 出力は常にUTF-8 (BOM付き)
                floor_df.to_csv(new_output_filename, index=False, encoding='utf-8-sig')
                created_files.append(os.path.abspath(new_output_filename))
                print(f"フロア「{floor}」のデータを「{new_output_filename}」に保存しました。", file=sys.stderr)
        else:
            print("警告: 「フロア名」で始まる列が見つかりませんでした。フロア分割が必要です。", file=sys.stderr)
            sys.exit(1)

        # stdout にはファイルパスのみを出力
        for file_path in created_files:
            print(file_path)

    except Exception as e:
        print(f"Error in process_csv.py: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
        main(input_file)
    else:
        print("エラー: 入力CSVファイルパスが必要です。", file=sys.stderr)
        sys.exit(1)