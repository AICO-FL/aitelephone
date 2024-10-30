# AI通話システム

## 概要
このシステムは、Vonage WebSocketを利用したリアルタイム音声通話のAI会話ロボットです。通話の着信時に自動応答し、ユーザーの発話を音声認識でテキスト化してDifyプロンプトに送り、応答を音声変換して通話相手に返信する双方向会話システムです。

## 主な機能
- リアルタイム音声通話処理（Vonage WebSocket）
- 音声認識（Google Cloud Speech-to-Text）
- AI応答生成（Dify）
- 音声合成（Google Cloud Text-to-Speech）
- 通話モニタリングとメトリクス収集
- 管理ダッシュボード
- プリセット挨拶の管理

## 技術スタック
- フロントエンド: Next.js, React, Tailwind CSS, shadcn/ui
- バックエンド: Node.js, Express
- データベース: PostgreSQL
- キャッシュ: Redis
- API: 
  - Vonage WebSocket API
  - Google Cloud Speech-to-Text API
  - Google Cloud Text-to-Speech API
  - Dify API

## 詳細セットアップ手順

### 1. システム要件
- Node.js 18以上
- PostgreSQL 14以上
- Redis 6以上
- npm または yarn

### 2. APIキーの取得

#### Vonage API
1. [Vonage Developer Portal](https://dashboard.nexmo.com/)でアカウントを作成
2. 新しいアプリケーションを作成し、以下の情報を取得:
   - API Key
   - API Secret
   - Application ID
   - Private Key
3. 電話番号を購入または設定

#### Google Cloud
1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
2. Speech-to-Text と Text-to-Speech APIを有効化
3. サービスアカウントを作成し、キーをダウンロード

#### Dify
1. [Dify](https://dify.ai/)でアカウントを作成
2. 新しいアプリケーションを作成
3. APIキーを取得

### 3. データベースのセットアップ

```bash
# PostgreSQLデータベースの作成
createdb ai_call_system

# Redisの起動確認
redis-cli ping
```

### 4. プロジェクトのセットアップ

```bash
# リポジトリのクローン
git clone <repository-url>
cd ai-call-system

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集して必要な値を設定

# データベースのマイグレーション
npm run migrate

# 開発サーバーの起動
npm run dev
```

### 5. 本番環境デプロイ

```bash
# プロダクションビルド
npm run build

# 本番環境変数の設定
cp .env.example .env.production
# .env.productionファイルを編集

# プロセス管理ツールのインストール
npm install -g pm2

# アプリケーションの起動
pm2 start npm --name "ai-call-system" -- start
```

## API仕様

### Vonage Webhook Endpoints

#### 着信応答 (POST /webhooks/vonage/answer)
```json
{
  "conversation_uuid": "string",
  "from": "string",
  "to": "string",
  "uuid": "string"
}
```

#### イベント通知 (POST /webhooks/vonage/events)
```json
{
  "status": "string",
  "conversation_uuid": "string",
  "timestamp": "string",
  "uuid": "string"
}
```

### 管理API

#### プリセット挨拶の取得 (GET /api/greetings)
```json
{
  "greetings": [
    {
      "id": "string",
      "text": "string",
      "description": "string",
      "isActive": boolean
    }
  ]
}
```

#### プリセット挨拶の作成 (POST /api/greetings)
```json
{
  "text": "string",
  "description": "string",
  "isActive": boolean
}
```

#### 通話履歴の取得 (GET /api/calls)
```json
{
  "calls": [
    {
      "id": "string",
      "startTime": "string",
      "endTime": "string",
      "status": "string",
      "metrics": {
        "latency": number,
        "packetLoss": number,
        "audioQuality": number
      }
    }
  ]
}
```

## エラーハンドリング

### 再接続メカニズム
- WebSocket切断時の自動再接続（最大3回）
- 指数バックオフによる再試行
- 永続的な接続失敗時のフォールバック処理

### エラーログ
- エラーの種類と発生時刻
- 関連する通話ID
- エラーコンテキスト
- スタックトレース

### レート制限
- API呼び出し制限
- 同時接続数制限
- バーストトラフィック制御

## パフォーマンス最適化

### 音声処理
- フレームサイズ: 640バイト（16kHz、20ms）
- バッファサイズ: 1MB
- 自動音量正規化

### キャッシュ戦略
- 頻出応答のキャッシュ（TTL: 1時間）
- セッションデータのキャッシュ
- メトリクスの一時保存

### データベース最適化
- インデックス最適化
- コネクションプーリング
- クエリキャッシュ

## トラブルシューティング

### よくある問題
1. WebSocket接続エラー
   - ネットワーク接続の確認
   - Vonage設定の確認
   - ファイアウォール設定の確認

2. 音声認識の問題
   - マイク入力レベルの確認
   - サンプリングレートの確認
   - Google Cloud認証の確認

3. データベース接続エラー
   - 接続文字列の確認
   - PostgreSQL/Redisの起動確認
   - ファイアウォール設定の確認

## ライセンス
MIT

## サポート
問題や質問がある場合は、Issueを作成してください。