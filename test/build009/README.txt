TSOC Exercise v2.1.0 / Build009
テストサイト保存領域分離 PATCH

対象:
  test/build009/ のみ

上書き:
  admin.js
  admin.html
  index.html

新規追加:
  test-storage-scope.js

目的:
  /test/build009/ の localStorage / IndexedDB を本番環境から分離します。
  本番のブラウザ保存データは削除・変更しません。

重要:
  反映直後のテスト環境は、分離された保存領域が空のため、
  管理画面では静的な218運動を基準に表示されます。
  先ほど保存した最新バックアップZIP
  TSOC_Exercise_FULL_BACKUP_20260907_103540.zip
  をテスト管理画面の「バックアップZIPから復元」で復元してください。
  復元先はテスト専用領域です。本番領域は変更されません。
