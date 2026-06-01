/**
 * admin (apps/admin) 専用 ESLint 設定。
 *
 * ルート config の overrides で FSD boundaries / no-restricted-imports / service_role 検査が
 * 適用される前提。本ファイルは alias 解決 (@/ → src/) を行うための import resolver 設定のみ
 * を担う。
 */
module.exports = {
  root: false,
  settings: {
    "import/resolver": {
      typescript: {
        project: __dirname + "/tsconfig.json",
        alwaysTryTypes: true,
      },
      alias: {
        map: [["@", __dirname + "/src"]],
        extensions: [".ts", ".tsx", ".vue", ".js", ".jsx"],
      },
      node: {
        extensions: [".ts", ".tsx", ".vue", ".js", ".jsx"],
      },
    },
  },
};
