// Script to add contact links to GitHub READMEs using GitHub API
// This is a reference script - would need GitHub token to run

const GITHUB_TOKEN = 'your-github-token-here'; // You'd need to provide this
const GITHUB_USERNAME = 'taslabs-net';

const CONTACT_SECTION = `

---

## Contact

Questions or feedback? [Get in touch!](https://contact.taslabs.net/)`;

async function addContactToREADMEs() {
    try {
        // Fetch all repositories
        const reposResponse = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        const repos = await reposResponse.json();
        console.log(`Found ${repos.length} repositories`);
        
        for (const repo of repos) {
            console.log(`\nProcessing ${repo.name}...`);
            
            try {
                // Check if README.md exists
                const readmeResponse = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${repo.name}/contents/README.md`, {
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (readmeResponse.status === 404) {
                    console.log(`⚠️  No README.md found in ${repo.name}`);
                    continue;
                }
                
                const readmeData = await readmeResponse.json();
                const currentContent = atob(readmeData.content);
                
                // Check if contact link already exists
                if (currentContent.includes('contact.taslabs.net')) {
                    console.log(`⏭️  Contact link already exists in ${repo.name}`);
                    continue;
                }
                
                // Add contact section
                const newContent = currentContent + CONTACT_SECTION;
                const encodedContent = btoa(newContent);
                
                // Update README.md
                const updateResponse = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${repo.name}/contents/README.md`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: 'Add contact link to README\n\nVisit https://contact.taslabs.net/ for questions or feedback.',
                        content: encodedContent,
                        sha: readmeData.sha
                    })
                });
                
                if (updateResponse.ok) {
                    console.log(`✅ Added contact link to ${repo.name}/README.md`);
                } else {
                    console.log(`❌ Failed to update ${repo.name}: ${updateResponse.status}`);
                }
                
                // Rate limiting - wait 1 second between requests
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.log(`❌ Error processing ${repo.name}: ${error.message}`);
            }
        }
        
        console.log('\n🎉 Finished processing all repositories!');
        
    } catch (error) {
        console.error('❌ Script failed:', error.message);
    }
}

// Uncomment to run (after adding your GitHub token)
// addContactToREADMEs();

console.log('GitHub API script created. To run:');
console.log('1. Get a GitHub Personal Access Token from https://github.com/settings/tokens');
console.log('2. Replace GITHUB_TOKEN with your actual token');
console.log('3. Uncomment the last line and run: node add-contact-api.js');