# セキュリティ監査レポート - リポジトリ公開準備

このレポートは、リポジトリを Public に変更する前のセキュリティ監査結果をまとめたものです。

作成日時: 2025-12-08

---

## 📋 監査概要

このリポジトリを Public に公開する前に、以下3点について詳細な監査を実施しました：

1. **機密情報のチェック**: コード内にハードコードされた機密情報の確認
2. **セキュリティ設定**: .gitignore の適切性と除外設定の確認
3. **公開手順**: GitHub上でPrivateからPublicに変更する手順

---

## ✅ 1. 機密情報のチェック結果

### 1.1 検査結果サマリー

**✓ 合格**: コード内にハードコードされた機密情報は発見されませんでした。

### 1.2 検査内容の詳細

以下のファイル・コードを精査しました：

#### TypeScript/JavaScript ファイル
- ✅ `lib/supabase/server.ts` - 環境変数のみ使用（`process.env.NEXT_PUBLIC_SUPABASE_URL`, `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`）
- ✅ `lib/supabase/client.ts` - 環境変数のみ使用
- ✅ `lib/supabase/middleware.ts` - 環境変数のみ使用
- ✅ `app/api/save-analysis/route.ts` - `process.env.SUPABASE_SERVICE_ROLE_KEY` を使用（環境変数）
- ✅ `app/api/update-goal/route.ts` - `process.env.SUPABASE_SERVICE_ROLE_KEY` を使用（環境変数）
- ✅ `app/api/recipients/route.ts` - 環境変数のみ使用
- ✅ `middleware.ts` - IPアドレスチェックはコメントアウト済み、環境変数参照

#### Python スクリプト
- ✅ `scripts/tag_icf.py` - `os.getenv()` で環境変数を使用
  - `OPENAI_API_KEY`
  - `AZURE_SEARCH_API_KEY`
  - `AZURE_AI_SEARCH_SERVICE_NAME`
  - `AZURE_AI_SEARCH_INDEX_NAME`

#### 設定ファイル
- ✅ `supabase/config.toml` - ローカル開発用設定のみ、機密情報は `env(...)` で参照
- ✅ `.env.example` - サンプル値のみ、実際のキーは含まれていない
- ✅ Git履歴チェック - `.env` ファイルのコミット履歴なし

#### Supabase Functions
- ✅ `supabase/functions/login-with-ip-check/index.ts` - `Deno.env.get()` で環境変数を使用
- ✅ `supabase/functions/approve-user/index.ts` - `Deno.env.get()` で環境変数を使用

### 1.3 潜在的な懸念点

以下の点は問題ありませんが、念のため確認をお勧めします：

1. **開発用URLの参照** (軽微)
   - `app/api/recipients/route.ts:6` に `http://127.0.0.1:5328/sctipts/tag_icf` がハードコード
   - **評価**: ローカル開発用のフォールバックURLであり、問題なし
   - **推奨**: 環境変数 `PYTHON_API_URL` で管理されており、本番環境では異なるURLが使用される

2. **IPアドレスの例示** (問題なし)
   - `middleware.ts:24` と `supabase/functions/login-with-ip-check/index.ts` にサンプルIPアドレス（127.0.0.1など）
   - **評価**: コメントアウトまたはサンプルとしての記述のみで、問題なし

### 1.4 認証・セキュリティパターンの確認

以下の優れたセキュリティプラクティスが実装されています：

- ✅ **認証の実装**: 全APIルートで Supabase セッション検証を実施
- ✅ **パストラバーサル対策**: `path.resolve()` と `startsWith()` チェックを使用
- ✅ **入力検証**: 年月形式、フロア名の正規表現検証を実施
- ✅ **Service Role Keyの保護**: サーバーサイドのみで使用、クライアント側には露出しない

---

## ✅ 2. .gitignore の設定確認

### 2.1 現在の .gitignore の評価

**評価**: ✓ 概ね適切ですが、いくつか追加推奨項目があります

### 2.2 現在の除外設定

現在の `.gitignore` には以下が含まれています：

```gitignore
# 依存関係
/node_modules
node_modules/
venv/
supabase/db/
supabase/.temp/
.supabase/

# Next.js ビルド成果物
/.next/
/out/
/dist
/build

# 環境変数ファイル
.env
.env.*
!.env.example
.env*.local

# Python
__pycache__/
*.pyc
/venv
/.venv

# OS ファイル
.DS_Store

# 一時ファイル
/tmp/*
/var/folders/*
```

### 2.3 推奨する追加項目

以下の項目を `.gitignore` に追加することを推奨します：

```gitignore
# IDEs and Editors
.vscode/
.idea/
*.swp
*.swo
*~
.project
.classpath
.settings/

# OS Files (追加)
Thumbs.db
Desktop.ini
*.DS_Store

# Logs
*.log
logs/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Test coverage
coverage/
.nyc_output/
*.lcov

# データディレクトリ（動的生成される場合）
data/
*.json.backup

# Vercel
.vercel

# TypeScript cache
*.tsbuildinfo
next-env.d.ts
```

### 2.4 既に適切に除外されているもの

- ✅ `.env` および `.env.*` ファイル
- ✅ `node_modules/`
- ✅ Python仮想環境 (`venv/`, `.venv/`)
- ✅ Supabaseローカルデータベース (`supabase/db/`, `.supabase/`)
- ✅ ビルド成果物 (`.next/`, `/out/`, `/dist`, `/build`)
- ✅ OS固有ファイル (`.DS_Store`)
- ✅ Python キャッシュ (`__pycache__/`, `*.pyc`)

---

## ✅ 3. リポジトリを Public に変更する手順

### 3.1 事前チェックリスト

Public に変更する前に、以下を必ず確認してください：

- [ ] 本レポートの全項目を確認済み
- [ ] `.env` ファイルが Git 管理下にないことを再確認
- [ ] Git履歴に機密情報が含まれていないことを確認
- [ ] README.md に機密情報が記載されていないことを確認
- [ ] 全ての依存関係のライセンスが Public 公開に対応していることを確認
- [ ] チームメンバーに Public 化について通知済み
- [ ] バックアップを取得済み

### 3.2 GitHub上での Public 変更手順

#### ステップ1: リポジトリ設定ページへ移動

1. GitHub でリポジトリ `iskw-Lab/feedback_app` を開く
2. 画面上部の **Settings** タブをクリック

#### ステップ2: Danger Zone セクションを開く

1. 設定ページを一番下までスクロール
2. **Danger Zone** セクションを見つける

#### ステップ3: Change visibility を実行

1. **Change visibility** セクションの **Change visibility** ボタンをクリック
2. **Change to public** を選択
3. 警告メッセージをよく読む：
   - このリポジトリは誰でも閲覧可能になります
   - Private から Public への変更は取り消せません（再度 Private にはできますが、フォークは残ります）
4. 確認のため、リポジトリ名 `iskw-Lab/feedback_app` を入力
5. **I understand, change repository visibility** をクリック

#### ステップ4: 公開後の確認

1. リポジトリページに戻り、Private バッジが消えていることを確認
2. ログアウトした状態（またはシークレットウィンドウ）でリポジトリが閲覧可能か確認
3. README.md が適切に表示されることを確認

### 3.3 Public 化後の推奨アクション

#### すぐに実施すべきこと

1. **コントリビューションガイドラインの追加**
   ```bash
   # CONTRIBUTING.md を作成し、コントリビューション方法を記載
   ```

2. **ライセンスファイルの確認**
   - `LICENSE` ファイルが存在するか確認
   - 存在しない場合は適切なライセンスを選択して追加

3. **Issue テンプレートの作成**
   ```bash
   # .github/ISSUE_TEMPLATE/ ディレクトリにテンプレートを配置
   ```

4. **セキュリティポリシーの追加**
   ```bash
   # SECURITY.md を作成し、脆弱性報告の方法を記載
   ```

#### 推奨する追加設定

1. **Branch Protection Rules** の設定
   - Settings > Branches で `main` ブランチを保護
   - Pull Request レビューを必須化
   - ステータスチェックの必須化

2. **Dependabot の有効化**
   - Settings > Security > Dependabot を有効化
   - セキュリティアップデートの自動化

3. **Code Scanning の有効化**
   - Settings > Security > Code scanning で GitHub Actions を設定
   - 脆弱性の自動検出

4. **README.md の更新**
   - バッジの追加（ビルドステータス、ライセンスなど）
   - より詳細なセットアップ手順の記載
   - コントリビューション方法の追記

---

## 🔒 セキュリティベストプラクティスの継続

Public リポジトリになった後も、以下のプラクティスを継続してください：

### 環境変数の管理

- ✅ 全ての機密情報は環境変数で管理
- ✅ `.env.example` を最新の状態に保つ
- ✅ 本番環境のキーは Vercel の Environment Variables で管理
- ✅ 開発者ごとに異なる `.env.local` を使用

### コードレビュー

- 全ての Pull Request でコードレビューを実施
- 機密情報の混入チェックを必須化
- セキュリティに関する変更は特に注意深くレビュー

### 定期的な監査

- 依存関係の脆弱性を定期的にチェック（`npm audit`）
- 環境変数の不要なものは削除
- アクセス権限の定期的な見直し

### インシデント対応計画

万が一、機密情報がコミットされた場合：

1. **即座に対応**
   - 該当するキーをすぐに無効化・再生成
   - サービスプロバイダー（Supabase、OpenAI、Azure）に連絡

2. **Git履歴からの削除**
   - `git filter-branch` または BFG Repo-Cleaner を使用
   - 全ての開発者に強制プッシュを通知

3. **影響範囲の調査**
   - アクセスログの確認
   - 不正使用の有無をチェック

4. **再発防止策**
   - Git hooks で機密情報のコミットを防止
   - より厳格なコードレビュープロセス

---

## 📊 監査結果サマリー

| 項目 | 結果 | 詳細 |
|------|------|------|
| ハードコードされた機密情報 | ✅ 問題なし | 全て環境変数で管理されている |
| .env ファイルの除外 | ✅ 適切 | .gitignore で適切に除外されている |
| Git 履歴の機密情報 | ✅ 問題なし | 過去のコミットに .env ファイルなし |
| .gitignore の設定 | ⚠️ 概ね良好 | 追加推奨項目あり（上記参照） |
| 認証・セキュリティ実装 | ✅ 良好 | 適切なセキュリティパターンを実装 |

---

## ✅ 最終判定

**このリポジトリは Public に公開する準備ができています。**

ただし、以下を実施することを強く推奨します：

1. `.gitignore` に推奨項目を追加（セクション 2.3 参照）
2. Public 化後に CONTRIBUTING.md, SECURITY.md, LICENSE を追加
3. Branch Protection と Dependabot を有効化

---

## 📝 追加リソース

- [GitHub: リポジトリの可視性を設定する](https://docs.github.com/ja/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)
- [GitHub: リポジトリのセキュリティ保護](https://docs.github.com/ja/code-security/getting-started/securing-your-repository)
- [Supabase: セキュリティベストプラクティス](https://supabase.com/docs/guides/platform/going-into-prod)

---

**監査実施者**: GitHub Copilot Security Agent  
**監査日時**: 2025-12-08  
**リポジトリ**: iskw-Lab/feedback_app  
**対象ブランチ**: copilot/check-security-and-prep-for-public
