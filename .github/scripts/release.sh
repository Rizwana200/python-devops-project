#!/bin/bash

VER=$1

if [[ -z "$VER" ]]; then
  echo "Error! Supply version tag!"
  exit 1
fi

read -r -d '' NOTES << EOM
\`\`\`
docker pull ghcr.io/Rizwana200/python-devops-project:$VER
\`\`\`

\`\`\`
docker run --rm -it -p 5000:5000 ghcr.io/Rizwana200/python-devops-project:$VER
\`\`\`
EOM

gh release create $VER --title "Release v$VER" -n "$NOTES"
