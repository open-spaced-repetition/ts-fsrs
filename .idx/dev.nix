# To learn more about how to use Nix to configure your environment
# see: https://developers.google.com/idx/guides/customize-idx-env
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-25.05"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = [
    # pkgs.go
    # pkgs.python311
    # pkgs.python311Packages.pip
    # pkgs.nodejs_20
    # pkgs.nodePackages.nodemon
    pkgs.rustup
    pkgs.gcc
    pkgs.cargo
    pkgs.pnpm
    pkgs.nodejs_20
    pkgs.fish
    pkgs.curl
    pkgs.cargo-wasi
  ];

  # Sets environment variables in the workspace
  env = { };
  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      "biomejs.biome"
      "yoavbls.pretty-ts-errors"
      "esbenp.prettier-vscode"

      "rust-lang.rust-analyzer"
      "tamasfe.even-better-toml"
      "vadimcn.vscode-lldb"

      "github.vscode-pull-request-github"
      "donjayamanne.githistory"

      "editorconfig.editorconfig"
      "streetsidesoftware.code-spell-checker"
    ];

    # Enable previews
    previews = {
      enable = true;
      previews = {
        # web = {
        #   # Example: run "npm run dev" with PORT set to IDX's defined port for previews,
        #   # and show it in IDX's web preview panel
        #   command = ["npm" "run" "dev"];
        #   manager = "web";
        #   env = {
        #     # Environment variables to set for your server
        #     PORT = "$PORT";
        #   };
        # };
      };
    };

    # Workspace lifecycle hooks
    workspace = {
      # Runs when a workspace is first created
      onCreate = {
        # Example: install JS dependencies from NPM
        # npm-install = "npm install";
        "rustup" = "rustup default stable && rustup target add wasm32-wasip1-threads";
        "pnpm-install" = "pnpm install";
        csv = ".devcontainer/csv.sh";
      };
      # Runs when the workspace is (re)started
      onStart = {
        # Example: start a background task to watch and re-build backend code
        "rustup" = "rustup default stable && rustup target add wasm32-wasip1-threads";
        "pnpm-install" = "pnpm install";
        csv = ".devcontainer/csv.sh";
      };
    };
  };
}
