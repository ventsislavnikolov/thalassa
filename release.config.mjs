// semantic-release, run by the `release` job in .github/workflows/ci.yml on
// every push to main. It reads the commits since the last tag: a breaking
// change cuts a major version, `feat` a minor one, `fix` and `perf` a patch,
// and the other types cut nothing. v1.0.0 was tagged by hand as the baseline,
// so the history before it stays out of the changelog.
// The notes keep the generator's default preset: conventionalcommits 10 needs
// conventional-changelog-writer 9, release-notes-generator 14 loads 8, and
// generating the notes then throws.

export default {
  branches: ["main"],
  plugins: [
    ["@semantic-release/commit-analyzer", { preset: "conventionalcommits" }],
    "@semantic-release/release-notes-generator",
    ["@semantic-release/changelog", { changelogFile: "CHANGELOG.md" }],
    ["@semantic-release/npm", { npmPublish: false }],
    [
      "@semantic-release/git",
      {
        assets: ["package.json", "CHANGELOG.md"],
        message:
          // biome-ignore lint/suspicious/noTemplateCurlyInString: semantic-release fills this template itself
          "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
    "@semantic-release/github",
  ],
};
