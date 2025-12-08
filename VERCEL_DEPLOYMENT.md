# Vercelデプロイメント手順書

このドキュメントでは、Feedback AppをVercelにデプロイする手順を説明します。

## 📋 目次

1. [前提条件](#前提条件)
2. [事前準備](#事前準備)
3. [Vercelへのデプロイ手順](#vercelへのデプロイ手順)
4. [環境変数の設定](#環境変数の設定)
5. [デプロイ後の確認](#デプロイ後の確認)
6. [トラブルシューティング](#トラブルシューティング)
7. [継続的デプロイメント](#継続的デプロイメント)
8. [Python スクリプトについて](#pythonスクリプトについて)

---

## 前提条件

デプロイを開始する前に、以下を準備してください：

- [x] GitHubアカウント
- [x] Vercelアカウント（[vercel.com](https://vercel.com)で無料登録可能）
- [x] Supabaseプロジェクト（[supabase.com](https://supabase.com)で無料作成可能）
- [x] OpenAI APIキー（AI機能を使用する場合）
- [x] Azure AI Search設定（検索機能を使用する場合）

---

## 事前準備

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)にアクセスしてログイン
2. 「New Project」をクリックして新しいプロジェクトを作成
3. プロジェクト名、データベースパスワード、リージョンを設定
4. プロジェクトの作成を待つ（数分かかります）

### 2. Supabase認証情報の取得

プロジェクトが作成されたら、以下の情報を取得します：

1. Supabaseダッシュボードで「Settings」→「API」を開く
2. 以下の値をメモしておく：
   - `Project URL`（NEXT_PUBLIC_SUPABASE_URL）
   - `anon/public key`（NEXT_PUBLIC_SUPABASE_ANON_KEY）
   - `service_role key`（SUPABASE_SERVICE_ROLE_KEY）⚠️ **機密情報**

### 3. その他の認証情報の準備

必要に応じて以下も準備します：

- **OpenAI API Key**: [OpenAI Platform](https://platform.openai.com/api-keys)で取得
- **Azure AI Search**: Azureポータルで検索サービスを作成し、サービス名とインデックス名を取得

---

## Vercelへのデプロイ手順

### 方法1: Vercel ダッシュボードからデプロイ（推奨）

#### ステップ1: GitHubリポジトリをインポート

1. [Vercel](https://vercel.com)にログイン
2. ダッシュボードで「Add New...」→「Project」をクリック
3. 「Import Git Repository」セクションで、GitHubアカウントを接続
4. `iskw-Lab/feedback_app` リポジトリを選択
5. 「Import」をクリック

#### ステップ2: プロジェクト設定

1. **Project Name**: デフォルトまたは任意の名前を設定
2. **Framework Preset**: 「Next.js」が自動選択されることを確認
3. **Root Directory**: `./`（デフォルト）のまま
4. **Build Settings**: 
   - Build Command: `npm run build`（デフォルト）
   - Output Directory: `.next`（デフォルト）
   - Install Command: `npm install`（デフォルト）

#### ステップ3: 環境変数の設定

「Environment Variables」セクションで以下を設定します：

```bash
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SERVICE_ROLE_KEY=your-service-role-key-here

# Azure AI Search設定
AZURE_AI_SEARCH_SERVICE_NAME=your-search-service-name
AZURE_AI_SEARCH_INDEX_NAME=your-index-name

# OpenAI API設定
OPENAI_API_KEY=your-openai-api-key-here

# IPアドレス許可リスト（カンマ区切り）
ALLOWED_IP_ADDRESSES=192.168.1.1,10.0.0.0/8

# アプリケーションURL（デプロイ後に更新）
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

⚠️ **重要**: 
- すべての環境変数を「Production」、「Preview」、「Development」すべてに追加
- `NEXT_PUBLIC_SITE_URL` は最初は仮の値でOK（デプロイ後に実際のURLに更新）

#### ステップ4: デプロイ実行

1. 「Deploy」ボタンをクリック
2. デプロイプロセスが開始されます（通常3-5分程度）
3. ビルドログを確認しながら待つ

### 方法2: Vercel CLI を使用したデプロイ

ローカル環境から直接デプロイする場合：

```bash
# Vercel CLIのインストール
npm install -g vercel

# プロジェクトディレクトリに移動
cd /path/to/feedback_app

# ログイン
vercel login

# デプロイ（初回は対話形式で設定）
vercel

# 本番環境にデプロイ
vercel --prod
```

---

## 環境変数の設定

### Vercelダッシュボードでの環境変数追加方法

1. Vercelダッシュボードで該当プロジェクトを選択
2. 「Settings」タブをクリック
3. 左メニューから「Environment Variables」を選択
4. 各変数を追加：
   - **Key**: 変数名（例: `NEXT_PUBLIC_SUPABASE_URL`）
   - **Value**: 変数の値
   - **Environment**: Production, Preview, Development すべてにチェック
5. 「Save」をクリック

### 環境変数の更新

環境変数を変更した場合：

1. Vercelダッシュボードで変更を保存
2. 「Deployments」タブに移動
3. 最新のデプロイメントの「...」メニューから「Redeploy」を選択
4. ビルドログで変更が反映されたことを確認

### 必須環境変数一覧

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase公開鍵 | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseサービスロール鍵 | ✅ |
| `SERVICE_ROLE_KEY` | サービスロール鍵（バックアップ） | ✅ |
| `OPENAI_API_KEY` | OpenAI APIキー | ⚠️ |
| `AZURE_AI_SEARCH_SERVICE_NAME` | Azure検索サービス名 | ⚠️ |
| `AZURE_AI_SEARCH_INDEX_NAME` | Azure検索インデックス名 | ⚠️ |
| `ALLOWED_IP_ADDRESSES` | 許可するIPアドレス | ⚠️ |
| `NEXT_PUBLIC_SITE_URL` | アプリケーションURL | ✅ |

✅ = 必須、⚠️ = 機能によっては必須

---

## デプロイ後の確認

### 1. デプロイメント状態の確認

1. Vercelダッシュボードで「Deployments」タブを開く
2. 最新のデプロイメントが「Ready」状態になっていることを確認
3. URLをクリックしてアプリケーションにアクセス

### 2. 機能テスト

デプロイ後、以下を確認してください：

- [ ] トップページが正常に表示される
- [ ] ログイン機能が動作する
- [ ] Supabaseとの接続が正常（認証、データ取得）
- [ ] 各ページが正常に表示される
- [ ] フィードバック投稿機能が動作する
- [ ] データの表示と分析機能が動作する

### 3. カスタムドメインの設定（オプション）

独自ドメインを使用する場合：

1. Vercelダッシュボードで「Settings」→「Domains」を開く
2. 「Add」をクリックして独自ドメインを入力
3. DNS設定の指示に従ってドメイン側で設定
4. 数分〜数時間でSSL証明書が自動発行される

---

## トラブルシューティング

### ビルドエラーが発生する場合

#### エラー: "Module not found"

**原因**: 依存関係のインストールに失敗している

**解決策**:
```bash
# ローカルで確認
npm install
npm run build

# package-lock.json または pnpm-lock.yaml が最新か確認
git add pnpm-lock.yaml
git commit -m "Update lock file"
git push
```

#### エラー: "Type errors in TypeScript"

**原因**: TypeScriptの型エラー

**解決策**: 
このプロジェクトは `next.config.mjs` で `ignoreBuildErrors: true` が設定済み。
もしエラーが出る場合は、ローカルで型エラーを修正するか、設定を確認してください。

### 環境変数が反映されない

**症状**: 環境変数が undefined になる

**解決策**:
1. Vercelダッシュボードで環境変数が正しく設定されているか確認
2. `NEXT_PUBLIC_` プレフィックスは必須（クライアントサイドで使用する変数）
3. 環境変数更新後は再デプロイが必要
4. Vercel CLI の場合: `vercel env pull .env.local` で確認

### Supabase接続エラー

**症状**: 認証やデータ取得でエラーが発生

**解決策**:
1. SupabaseのURLとキーが正しいか確認
2. Supabase側でRLS（Row Level Security）ポリシーが設定されているか確認
3. Vercelのデプロイドメインを、Supabaseの「Authentication」→「URL Configuration」の「Site URL」に追加

### デプロイは成功するが503エラーが出る

**原因**: サーバーレス関数のタイムアウトまたはメモリ不足

**解決策**:
1. Vercelの無料プランでは10秒のタイムアウト制限あり
2. プロプランにアップグレードして制限を緩和
3. 重い処理は別のバックエンドサービスに分離を検討

### 画像が表示されない

**原因**: Next.jsの画像最適化設定

**解決策**: 
このプロジェクトは `next.config.mjs` で `images.unoptimized: true` が設定済み。
外部画像を使用する場合は `next.config.mjs` の `images.domains` に追加が必要です。

---

## 継続的デプロイメント（CI/CD）

Vercelは自動的にGitHubと連携し、CI/CDを提供します：

### 自動デプロイの仕組み

- **本番デプロイ**: `main` ブランチへのプッシュ/マージ時
- **プレビューデプロイ**: プルリクエスト作成/更新時
- **ブランチデプロイ**: 任意のブランチへのプッシュ時

### デプロイ設定のカスタマイズ

1. Vercelダッシュボードで「Settings」→「Git」を開く
2. 以下を設定可能：
   - Production Branch（本番ブランチ）
   - Auto-deploy branches（自動デプロイ対象）
   - Ignored Build Step（特定条件でビルドをスキップ）

### プレビューデプロイの活用

プルリクエストごとに自動的にプレビューURLが生成されます：

1. PRを作成すると、Vercelボットがコメントを投稿
2. プレビューURLで変更内容を確認
3. 問題なければPRをマージ→本番に自動デプロイ

---

## Pythonスクリプトについて

このプロジェクトには、データ処理用のPythonスクリプト（`scripts/` ディレクトリ）が含まれています。

### 重要な注意点

⚠️ **Vercelでは直接Pythonスクリプトを実行できません**

Vercelは主にフロントエンドとサーバーレス関数（Node.js）をホスティングするプラットフォームです。
Pythonスクリプトを実行する必要がある場合、以下の選択肢があります：

### オプション1: ローカル/別サーバーで実行（推奨）

データ処理バッチジョブとして、以下で実行：

```bash
# ローカル環境で実行
python scripts/process_csv.py
python scripts/tag_icf.py
python scripts/tome_evaluation.py
```

**使用例**:
- 定期的なデータ分析
- CSVファイルの一括処理
- レポート生成

### オプション2: Vercel Serverless Functions（Python）

Vercel は Python のサーバーレス関数もサポートしています：

1. `api/` ディレクトリに `.py` ファイルを配置
2. 関数として定義
3. HTTPエンドポイントとして呼び出し可能

**例**: `api/process.py`
```python
from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'message': 'Hello from Python!'}).encode())
        return
```

### オプション3: 外部サービスを利用

重い処理や長時間実行が必要な場合：

- **AWS Lambda**: より長いタイムアウト（最大15分）
- **Google Cloud Functions**: Python実行環境
- **Heroku**: 専用のワーカーdyno
- **Railway**: コンテナベースのデプロイ

### 推奨構成

```
フロントエンド（Vercel）
    ↓ API呼び出し
Next.js API Routes（Vercel Serverless Functions）
    ↓ データ取得・軽い処理
Supabase（データベース）

重い処理・バッチ処理
    ↓
別のサーバー/Lambda/ローカル実行
```

---

## セキュリティのベストプラクティス

### 1. 環境変数の管理

- ✅ 本番環境の秘密鍵は絶対にGitにコミットしない
- ✅ Vercelの環境変数機能を使用
- ✅ 開発/本番で異なる認証情報を使用
- ✅ 定期的にキーをローテーション（最低でも四半期ごと）

### 2. IP制限

`ALLOWED_IP_ADDRESSES` を設定して、特定のIPアドレスのみアクセスを許可：

```bash
ALLOWED_IP_ADDRESSES=192.168.1.1,10.0.0.0/8
```

### 3. Supabase RLS（Row Level Security）

Supabase側でRLSポリシーを適切に設定し、データアクセスを制限してください。

### 4. CORS設定

必要に応じて、`next.config.mjs` でCORS設定を追加：

```javascript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: 'https://your-domain.com' },
      ],
    },
  ]
}
```

---

## パフォーマンス最適化

### 1. 画像最適化

Next.js Image コンポーネントを使用：

```jsx
import Image from 'next/image'

<Image 
  src="/path/to/image.jpg" 
  width={500} 
  height={300} 
  alt="Description"
/>
```

### 2. 動的インポート

大きなコンポーネントは動的インポート：

```jsx
import dynamic from 'next/dynamic'

const DynamicComponent = dynamic(() => import('../components/Heavy'))
```

### 3. キャッシング

Vercelは自動的に静的アセットとAPIレスポンスをキャッシュします。
さらに最適化するには：

```typescript
// app/api/route.ts
export const revalidate = 3600 // 1時間キャッシュ
```

---

## サポートとリソース

### 公式ドキュメント

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)

### よくある質問

**Q: デプロイにかかる時間は？**
A: 通常3-5分程度です。初回は依存関係のインストールで少し長くなることがあります。

**Q: 無料プランの制限は？**
A: Vercel Hobbyプランは個人プロジェクトに十分です。商用利用にはProプランが推奨されます。

**Q: カスタムドメインは使える？**
A: はい、無料プランでも独自ドメインを設定できます。

**Q: データベースのバックアップは？**
A: Supabaseは自動バックアップ機能があります。有料プランではPoint-in-Time Recovery（PITR）も利用可能。

---

## まとめ

このガイドに従ってデプロイすれば、Feedback AppをVercelで簡単に運用できます。

### チェックリスト

デプロイ前に以下を確認：

- [ ] Supabaseプロジェクトが作成済み
- [ ] 必要な環境変数をすべて取得済み
- [ ] GitHubリポジトリがVercelに接続済み
- [ ] 環境変数がVercelに設定済み
- [ ] デプロイが成功し、「Ready」状態
- [ ] アプリケーションが正常に動作
- [ ] 必要に応じてカスタムドメイン設定済み

何か問題が発生した場合は、[トラブルシューティング](#トラブルシューティング)セクションを参照してください。

---

**Happy Deploying! 🚀**
