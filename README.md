Next.js をベースにした子ども向けデジタルおもちゃプロジェクトです。Cloudflare Workers にデプロイします。

## Getting Started

開発サーバーを起動:

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000) を開いて確認してください。`src/app/page.tsx` を編集すると自動反映されます。

## Cloudflare Workers へのデプロイ

[@opennextjs/cloudflare](https://opennext.js.org/cloudflare) を使ってビルド・デプロイします。

```bash
# ローカルで Cloudflare Workers 環境をシミュレートして確認
pnpm preview

# 本番デプロイ
pnpm deploy
```

初回デプロイ前に `wrangler login` で Cloudflare アカウントに接続してください。

`wrangler.jsonc` の設定を変更した場合は、型定義を再生成してください:

```bash
pnpm cf-typegen
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [OpenNext for Cloudflare](https://opennext.js.org/cloudflare)
