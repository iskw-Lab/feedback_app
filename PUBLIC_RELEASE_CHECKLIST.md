# 🚀 Public Release チェックリスト

このチェックリストは、feedback_appリポジトリをPrivateからPublicに変更する際の確認事項をまとめたものです。

## 📋 公開前チェックリスト

### 🔐 セキュリティチェック

- [ ] **環境変数の確認**
  - [ ] `.env` ファイルがリポジトリに含まれていないことを確認
  - [ ] `.env.example` にプレースホルダーのみが記載されていることを確認
  - [ ] Git履歴に `.env` ファイルが含まれていないことを確認
    ```bash
    git log --all --full-history -- ".env" ".env.local"
    ```

- [ ] **コード内の機密情報チェック**
  - [ ] ハードコードされたAPIキーがないことを確認
    ```bash
    grep -r -i "sk-[a-zA-Z0-9]" --exclude-dir=node_modules --exclude-dir=.git
    grep -r -i "eyJ[a-zA-Z0-9]" --exclude-dir=node_modules --exclude-dir=.git
    ```
  - [ ] パスワードがコード内に含まれていないことを確認
  - [ ] コメント内に機密情報がないことを確認

- [ ] **Vercel環境変数の設定**
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` を設定
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` を設定（Production/Preview）
  - [ ] `AZURE_AI_SEARCH_SERVICE_NAME` を設定
  - [ ] `AZURE_AI_SEARCH_INDEX_NAME` を設定
  - [ ] `AZURE_SEARCH_API_KEY` を設定
  - [ ] `OPENAI_API_KEY` を設定
  - [ ] `ALLOWED_IP_ADDRESSES` を設定（必要に応じて）
  - [ ] `NEXT_PUBLIC_SITE_URL` を設定

### 🗄️ データベース・バックエンドチェック

- [ ] **Supabase設定**
  - [ ] Row Level Security (RLS) が有効になっていることを確認
  - [ ] すべてのテーブルに適切なRLSポリシーが設定されていることを確認
  - [ ] 公開されるべきでないテーブルが保護されていることを確認
  - [ ] Service Role Keyの使用箇所を最小限に抑えていることを確認

- [ ] **API Routeのセキュリティ**
  - [ ] 認証チェックが実装されていることを確認
  - [ ] パストラバーサル対策が実装されていることを確認
  - [ ] 入力値のバリデーションが実装されていることを確認

### 📝 ドキュメンテーション

- [ ] **README.md**
  - [ ] プロジェクトの説明が適切か確認
  - [ ] インストール手順が明確か確認
  - [ ] 使用技術スタックが記載されているか確認
  - [ ] 個人情報や機密情報が含まれていないか確認
  - [ ] コントリビューションガイドライン（必要に応じて）

- [ ] **LICENSE ファイル**
  - [ ] ライセンスファイルを追加（MIT, Apache 2.0 など）
  - [ ] または、Publicにする場合のライセンス方針を明記

- [ ] **CONTRIBUTING.md（オプション）**
  - [ ] コントリビューションガイドラインの作成（必要に応じて）

### 🔍 コード品質チェック

- [ ] **依存関係の脆弱性チェック**
  ```bash
  npm audit
  npm audit fix
  ```

- [ ] **ビルドの確認**
  ```bash
  npm run build
  ```

- [ ] **Lintの実行**
  ```bash
  npm run lint
  ```

- [ ] **デバッグコードの削除**
  - [ ] `console.log` の不要な出力を削除
  - [ ] デバッグ用のコメントを削除
  - [ ] テスト用のダミーデータを削除

### 🌐 デプロイメント確認

- [ ] **Vercelデプロイ**
  - [ ] 本番環境が正常にデプロイされることを確認
  - [ ] すべての環境変数が正しく設定されていることを確認
  - [ ] ビルドエラーがないことを確認

- [ ] **機能テスト**
  - [ ] ログイン機能が動作することを確認
  - [ ] データの保存・取得が正常に動作することを確認
  - [ ] 主要な機能が正常に動作することを確認

## 🚀 GitHub Public化の手順

### 手順 1: 最終確認
1. 上記のすべてのチェックリスト項目を完了させる
2. 最新の変更をmainブランチにマージ

### 手順 2: GitHubでPublicに変更

1. **リポジトリページにアクセス**
   - https://github.com/iskw-Lab/feedback_app にアクセス

2. **Settingsタブを開く**
   - リポジトリページ上部の **Settings** をクリック

3. **Danger Zone セクションへ移動**
   - 左サイドバーの **General** を選択
   - ページ下部の **Danger Zone** セクションまでスクロール

4. **Change repository visibility をクリック**
   - **Change visibility** ボタンをクリック

5. **Make public を選択**
   - モーダルで **Make public** を選択
   - リポジトリ名 `iskw-Lab/feedback_app` を入力
   - **I understand, change repository visibility** をクリック

### 手順 3: 公開後の確認

- [ ] リポジトリページのバッジが **Public** になっていることを確認
- [ ] ログアウトした状態でリポジトリが閲覧できることを確認
- [ ] READMEが正しく表示されることを確認
- [ ] Issuesタブが適切に設定されていることを確認（有効/無効）
- [ ] Discussions、Projects、Wikiなどの設定を確認（必要に応じて有効化）

## 🎉 公開完了後のアクション

### 推奨設定

- [ ] **GitHub Security機能の有効化**
  - Security タブ → **Dependabot alerts** を有効化
  - Security タブ → **Code scanning** を有効化（可能な場合）
  - Security タブ → **Secret scanning** を確認

- [ ] **ブランチ保護ルールの設定**
  - Settings → Branches → Add rule
  - `main` ブランチを保護
  - Require pull request reviews before merging を有効化（推奨）

- [ ] **Issue/PR テンプレートの作成**（オプション）
  - `.github/ISSUE_TEMPLATE/` ディレクトリを作成
  - バグレポート、機能リクエストのテンプレートを追加

### 継続的なメンテナンス

- [ ] **定期的な依存関係の更新**
  - 月1回 `npm update` と `npm audit` を実行
  - Dependabotの自動PRを確認してマージ

- [ ] **セキュリティアップデートの監視**
  - GitHub Security タブを定期的にチェック
  - 脆弱性が発見された場合は速やかに対応

- [ ] **ドキュメントの更新**
  - 機能追加時はREADMEを更新
  - 変更履歴を記録（CHANGELOG.md など）

## 📞 トラブルシューティング

### 問題: 環境変数が正しく設定されていない

**解決策**:
1. Vercel Dashboard → プロジェクト → Settings → Environment Variables を確認
2. 各環境（Production, Preview, Development）で正しく設定されているか確認
3. 変更後は再デプロイが必要

### 問題: ビルドが失敗する

**解決策**:
1. ローカルで `npm run build` を実行してエラーを確認
2. `package.json` の依存関係を確認
3. Node.jsのバージョンを確認（Vercel設定と一致させる）

### 問題: 機密情報が誤ってコミットされた

**解決策**:
1. **すぐにキーをローテーション**（新しいキーを生成）
2. Git履歴から機密情報を削除（`git filter-branch` または BFG Repo-Cleaner）
3. force pushが必要な場合は慎重に実行
4. すべてのチームメンバーに通知

---

## ✅ 完了確認

すべてのチェック項目を完了したら、このリポジトリはPublic公開準備完了です！

**チェックリスト完了日**: ___________________  
**公開実施日**: ___________________  
**実施者**: ___________________

---

**注意**: このチェックリストは推奨事項です。プロジェクトの性質に応じて、追加の確認項目が必要な場合があります。
