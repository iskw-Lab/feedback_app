# コントリビューションガイド

feedback_app プロジェクトへの貢献に興味を持っていただき、ありがとうございます！

---

## 🤝 コントリビューションの方法

### Issue の作成

バグ報告や機能リクエストは、GitHub の Issue として作成してください。

#### バグレポート

以下の情報を含めてください：
- 問題の詳細な説明
- 再現手順
- 期待される動作
- 実際の動作
- 環境情報（OS, ブラウザ, Node.js バージョンなど）

#### 機能リクエスト

以下の情報を含めてください：
- 機能の説明
- ユースケース
- 期待される効果

---

## 💻 開発環境のセットアップ

### 前提条件

- Node.js v22.x 以上
- Python 3.9.6 以上
- Supabase アカウント

### セットアップ手順

1. **リポジトリのフォーク**
   ```bash
   # GitHub でリポジトリをフォークしてからクローン
   git clone https://github.com/YOUR_USERNAME/feedback_app.git
   cd feedback_app
   ```

2. **依存関係のインストール**
   ```bash
   # Node.js の依存関係
   npm install
   
   # Python の依存関係
   python3 -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **環境変数の設定**
   ```bash
   cp .env.example .env.local
   # .env.local に必要な値を設定
   ```

4. **開発サーバーの起動**
   ```bash
   npm run dev
   ```

---

## 📝 コーディング規約

### TypeScript/JavaScript

- **フォーマット**: Prettier を使用（設定は `.prettierrc` を参照）
- **リント**: ESLint を使用（`npm run lint` で確認）
- **命名規則**:
  - コンポーネント: PascalCase（例: `UserProfile.tsx`）
  - 関数: camelCase（例: `getUserData`）
  - 定数: UPPER_SNAKE_CASE（例: `MAX_RETRY_COUNT`）

### Python

- **スタイルガイド**: PEP 8 に準拠
- **フォーマット**: Black を推奨
- **型ヒント**: 可能な限り型ヒントを使用

### コミットメッセージ

明確で説明的なコミットメッセージを書いてください。

```
<type>: <subject>

<body>
```

**Type:**
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメントの変更
- `style`: コードの意味に影響しない変更（フォーマットなど）
- `refactor`: リファクタリング
- `test`: テストの追加・修正
- `chore`: ビルドプロセスやツールの変更

**例:**
```
feat: add user authentication with Supabase

- Implement login/logout functionality
- Add session management
- Update middleware for auth check
```

---

## 🔄 Pull Request の流れ

### 1. ブランチの作成

```bash
git checkout -b feature/your-feature-name
# または
git checkout -b fix/your-bug-fix
```

### 2. 変更の実装

- 小さく、焦点を絞った変更を心がける
- 既存のテストが通ることを確認
- 必要に応じて新しいテストを追加

### 3. コードのテスト

```bash
# リントチェック
npm run lint

# ビルドチェック
npm run build

# （テストがある場合）テストの実行
npm test
```

### 4. コミットとプッシュ

```bash
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature-name
```

### 5. Pull Request の作成

- GitHub でフォーク元のリポジトリに対して Pull Request を作成
- PR のタイトルは明確に
- 変更内容の詳細な説明を記載
- 関連する Issue があればリンク

### 6. レビュープロセス

- レビュアーからのフィードバックに対応
- 必要に応じて追加のコミットを行う
- 承認されたら、メンテナーがマージします

---

## 🔒 セキュリティに関する注意事項

### 絶対に行わないこと

- ❌ APIキー、パスワード、トークンをコミットしない
- ❌ 個人情報やセンシティブなデータをコミットしない
- ❌ `.env` ファイルをコミットしない

### 環境変数の管理

- ✅ 全ての機密情報は `.env.local` で管理
- ✅ 新しい環境変数を追加した場合は `.env.example` も更新
- ✅ コミット前に `git status` で `.env` ファイルが含まれていないことを確認

### セキュリティ脆弱性の報告

セキュリティに関する問題を発見した場合は、公開の Issue ではなく、プロジェクトメンテナーに直接連絡してください。詳細は [SECURITY.md](./SECURITY.md) を参照してください。

---

## ✅ Pull Request チェックリスト

PR を作成する前に、以下を確認してください：

- [ ] コードがリポジトリのコーディング規約に従っている
- [ ] `npm run lint` が通る
- [ ] `npm run build` が成功する
- [ ] 変更が既存の機能を壊していない
- [ ] 必要に応じてドキュメントを更新した
- [ ] コミットメッセージが明確で説明的
- [ ] `.env` ファイルや機密情報がコミットされていない

---

## 🙋 質問やサポート

わからないことがあれば、以下の方法で質問してください：

- GitHub の Issue で質問を作成
- GitHub の Discussions を利用（有効な場合）

---

## 📜 ライセンス

このプロジェクトに貢献することで、あなたの貢献が同じライセンスの下でライセンスされることに同意したものとみなされます。

---

ご協力ありがとうございます！ 🎉
