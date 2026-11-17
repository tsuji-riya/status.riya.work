# status.riya.work

[status.riya.work](https://status.riya.work) のステータスページ。React + [Primer](https://primer.style) で作っていて、`main` に push すると GitHub Pages にデプロイされる。

ページは静的ファイルだけで、中身は [tsuji-riya/lab](https://github.com/tsuji-riya/lab) の `apps/status` で動いている Gatus の API (`https://status-api.riya.work/api/v1/endpoints/statuses`) を 1 分ごとに読んで表示する。監視対象を増やすときは lab 側の `apps/status/gatus.yaml` に足す。グループの見出しは `src/App.tsx` の `groups` に手で書いている。

API に届かないときはクラスタか Tunnel が落ちているので、ページはその旨を出す。

```sh
npm ci
npm run dev
```
