TSOC Exercise Web v2.1.0 / Build013
JSZip 3.10.1 固定版

対象:
  test/build009/ のみ

上書き:
  admin.js
  admin.html
  index.html
  build-info.js

新規追加:
  vendor/jszip-3.10.1.min.js

原因:
  現在の vendor/jszip.min.js は ZIP作成はできる一方、
  バックアップZIP読込に必要な loadAsync API を持っていませんでした。
  Build011/012では呼び出し方だけを変更しましたが、
  ライブラリ自体に loadAsync が無いため解決しませんでした。

Build013:
  - JSZip 3.10.1 をテスト環境専用ファイルとして追加
  - 管理画面ではこのJSZip 3.10.1を明示的に読み込む
  - バックアップ作成と復元の両方で同じJSZip 3.10.1を使用
  - 本番 vendor/jszip.min.js は変更しない
  - 本番環境への変更なし

反映確認:
  管理画面に「TSOC Exercise Web v2.1.0 / Build013」と表示されれば反映済みです。
