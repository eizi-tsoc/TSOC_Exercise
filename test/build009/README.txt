TSOC Exercise Web v2.1.0 / Build012
管理画面スクリプト読込修正

対象:
  test/build009/ のみ

上書き:
  admin.js
  admin.html
  index.html
  build-info.js

原因:
  Build011では画面表示だけBuild011に更新されていた一方、
  admin.html の動的読込URLが admin.js?v=2.1.0-b009-isolation1 のままでした。
  そのためブラウザが古いadmin.jsを読み込み、
  JSZip.loadAsync is not a function が残っていました。

修正:
  - admin.js の読込URLを Build012 に更新
  - test-storage-scope.js のキャッシュバスターも Build012 に更新
  - ZIP復元処理は new JSZip() → zip.loadAsync(file) を使用
  - 管理画面・選択画面・build-infoを Build012 表示へ統一
  - 本番環境は変更しない

反映確認:
  管理画面に「TSOC Exercise Web v2.1.0 / Build012」と表示されれば反映済みです。
