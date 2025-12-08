# Feedback App

介護スタッフ向けのフィードバック収集・分析アプリケーションです。

## 使用技術 (Tech Stack)

* **Frontend:** Next.js (App Router), React, TypeScript
* **Backend:** Next.js API Routes (`app/api`), Python (データ処理バッチ)
* **Database / BaaS:** Supabase
* **Data Processing:** Python (Pandas, etc.)
* **Deployment:** Vercel (想定)

---

## 📦 デプロイメント (Deployment)

Vercelへのデプロイ手順については、**[VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)** をご参照ください。

---

## 使い方 / ローカル開発 (Getting Started)

このプロジェクトには2つの起動方法があります。Dockerを使う方法（推奨）と、ローカル環境に直接インストールする方法です。

### Dockerを使った起動方法 (推奨)

`docker-compose.yml` ファイルを使って、フロントエンドとバックエンド（もしあれば）を一度に起動します。

1.  **環境変数の設定**
    `.env.example` をコピーして `.env.local` を作成します。（Supabaseのキーなどを設定してください）
    ```bash
    cp .env.example .env.local
    ```

2.  **Dockerコンテナのビルドと起動**
    ```bash
    docker-compose up -d --build
    ```

3.  **アクセス**
    ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

---

### 💻 ローカル環境での起動方法 (Dockerなし)

#### 1. 前提条件 (Prerequisites)
* [Node.js](https://nodejs.org/en/) (v22.x or later)
* [Python](https://www.python.org/downloads/) (v3.9.6 or later)
* npm (Node.jsに同梱)

### 2. インストール (Installation)

1.  リポジトリをクローンします。
    ```bash
    git clone [https://github.com/iskw-Lab/feedback_app.git](https://github.com/iskw-Lab/feedback_app.git)
    cd feedback-app
    ```

2.  フロントエンドの依存関係をインストールします。
    ```bash
    npm install
    ```

3.  Pythonの仮想環境を作成し、ライブラリをインストールします。
    ```bash
    # 仮想環境を作成 (例: venv)
    python3 -m venv venv
    
    # 仮想環境をアクティベート
    source venv/bin/activate  # Mac/Linux
    # venv\Scripts\activate   # Windows
    
    # 必要なPythonライブラリをインストール
    pip install -r requirements.txt
    ```

### 3. 環境変数の設定 (Environment Variables)

このプロジェクトは、秘密鍵の管理に `.env.local` を使用します。
`.env.example` ファイルをコピーして、ご自身のSupabaseキーなどを設定してください。

1.  `.env.local` ファイルを作成します。
    ```bash
    # 新しくセットアップする人向けの指示
    cp .env.example .env.local
    ```

2.  `.env.local` に必要なキーを記述します。
    ```
    # .env.local
    NEXT_PUBLIC_SUPABASE_URL="YOUR_SUPABASE_URL"
    NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_KEY"
    SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"
    SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"

    AZURE_AI_SEARCH_SERVICE_NAME="YOUR_AZURE_AI_SEARCH_SERVICE_NAME"
    AZURE_AI_SEARCH_INDEX_NAME="YOUR_AZURE_AI_SEARCH_INDEX_NAME"
    OPENAI_API_KEY="YOUR_OPENAI_API_KEY"

    ALLOWED_IP_ADDRESSES="YOUR_IP_ADDRESSES"

    NEXT_PUBLIC_SITE_URL=http://localhost:3000
    ```

---

## 🚀 アプリケーションの実行 (Running the Application)

### 1. フロントエンド (Next.js)

以下のコマンドでNext.jsの開発サーバーを起動します。

```bash
npm run dev
```

public/characterN.pngはちょこなすさんのイラストを使用させていただきました．
https://choconasu.com/
