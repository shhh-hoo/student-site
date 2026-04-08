# Definitions policy

Definitions are now filtered to keep only two sources:

1. definitions that appear as real definition-style prompts in past papers
2. definitions or named terms that the syllabus explicitly expects candidates to know in a define / what-is-meant-by style

Each retained definition includes a `source_scope` field with one of:

- `paper_only`
- `syllabus_only`
- `paper_and_syllabus`

Items that are not true definitions, such as standard conditions, fixed equations, assumptions, or short conclusion statements, are moved to level 1 core files such as `core-fixed-conclusions.json`.
