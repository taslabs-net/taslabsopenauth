#!/bin/bash
# Script to add contact link to all GitHub repository READMEs

# Contact section to add
CONTACT_SECTION="

---

## Contact

Questions or feedback? [Get in touch!](https://contact.taslabs.net/)"

# Get list of your repositories
echo "Fetching your repositories..."
repos=$(gh repo list --limit 100 --json name --jq '.[].name')

for repo in $repos; do
    echo "Processing repository: $repo"
    
    # Clone the repository
    gh repo clone "taslabs-net/$repo" temp-$repo 2>/dev/null
    
    if [ -d "temp-$repo" ]; then
        cd "temp-$repo"
        
        # Check if README.md exists
        if [ -f "README.md" ]; then
            # Check if contact section already exists
            if ! grep -q "contact.taslabs.net" README.md; then
                # Add contact section to README
                echo "$CONTACT_SECTION" >> README.md
                
                # Commit and push changes
                git add README.md
                git commit -m "Add contact link to README

Visit https://contact.taslabs.net/ for questions or feedback."
                git push
                
                echo "✅ Added contact link to $repo/README.md"
            else
                echo "⏭️  Contact link already exists in $repo/README.md"
            fi
        else
            echo "⚠️  No README.md found in $repo"
        fi
        
        cd ..
        rm -rf "temp-$repo"
    else
        echo "❌ Failed to clone $repo"
    fi
    
    echo ""
done

echo "🎉 Finished processing all repositories!"