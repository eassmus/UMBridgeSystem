{ pkgs ? import <nixpkgs> { config.allowUnfree = true; } }:

pkgs.mkShell rec {

  buildInputs = with pkgs; [
    nodejs
  ];

  shellHook = ''
  '';
}
