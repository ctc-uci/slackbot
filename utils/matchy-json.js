const Bot = require("./bot");
const fs = require("fs");
const path = require("path");

// Create welcome message for matchy groups - Easy to edit!
const createWelcomeMessage = () => {
  const activities = [
    "☕ Grab a sweet treat (Omomomo, Mori's, Heytea, etc.)",
    "🍕 Grab food together (In-N-Out, Wadaya, Cava, Yintang, Burnt Crumbs, etc.)",
    "🏓 Play sports at the ARC (Pickleball, Badminton, Volleyball, etc.)",
    "🎮 Play League/Valorant together",
    "🛍️ Go shopping (Irvine Spectrum, Thrifting/Bins, etc.)",
    "🗺️ Explore a new place (Hiking Trail, Beach, etc.)",
    "💬 Just chat and get to know each other!"
  ];

  return `🎯 *Welcome to your Matchy Meetup!*

This is your weekly match group! Feel free to introduce yourselves and plan your meetup. Have fun! 🎉

*💡 Activity Ideas:*
${activities.map(activity => `• ${activity}`).join('\n')}

*Remember:* The goal is to connect and build relationships. Keep it casual and fun! 🤓👍`;
};

// Load members data from JSON file
const loadMembersData = () => {
  try {
    const dataPath = path.join(__dirname, "../data/members.json");
    const data = fs.readFileSync(dataPath, "utf8");
    const parsed = JSON.parse(data);
    
    // Ensure the structure is correct
    return {
      members: parsed.members || [],
      previousMatches: parsed.previousMatches || {}
    };
  } catch (error) {
    console.error("Error loading members data:", error);
    return { members: [], previousMatches: {} };
  }
};

// Save members data to JSON file
const saveMembersData = (data) => {
  try {
    const dataPath = path.join(__dirname, "../data/members.json");
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error saving members data:", error);
  }
};

// Get all members who have matchyEnabled: true
const getMembersFromJSON = () => {
  const data = loadMembersData();
  return data.members
    .filter((member) => member.matchyEnabled)
    .map((member) => member.slackId);
};

// Get previous matches from JSON
const getPreviousMatches = () => {
  const data = loadMembersData();
  return data.previousMatches || {};
};

// Update previous matches in JSON
const updatePreviousMatches = (currentMatches, previousMatches) => {
  const data = loadMembersData();
  
  // Update previous matches with current matches
  for (const match of currentMatches) {
    for (let i = 0; i < match.length; i++) {
      for (let j = i + 1; j < match.length; j++) {
        const user1 = match[i];
        const user2 = match[j];
        
        if (!previousMatches[user1]) previousMatches[user1] = [];
        if (!previousMatches[user2]) previousMatches[user2] = [];
        
        if (!previousMatches[user1].includes(user2)) {
          previousMatches[user1].push(user2);
        }
        if (!previousMatches[user2].includes(user1)) {
          previousMatches[user2].push(user1);
        }
      }
    }
  }
  
  // Save updated data
  data.previousMatches = previousMatches;
  saveMembersData(data);
};

// Check if two members can be paired (haven't met before)
const validPairing = (member1, member2, previousMatches) => {
  const member1Previous = previousMatches[member1] || [];
  const member2Previous = previousMatches[member2] || [];
  
  return !member1Previous.includes(member2) && !member2Previous.includes(member1);
};

// Check if all possible unique combinations have been exhausted
const allCombinationsExhausted = (members, previousMatches) => {
  const totalMembers = members.length;
  const maxPossiblePairs = (totalMembers * (totalMembers - 1)) / 2;
  
  // Count total unique pairs that have met
  const allMetPairs = new Set();
  for (const member of members) {
    const previous = previousMatches[member] || [];
    for (const metMember of previous) {
      if (members.includes(metMember)) {
        // Create a consistent pair key (smaller ID first)
        const pairKey = member < metMember ? `${member}-${metMember}` : `${metMember}-${member}`;
        allMetPairs.add(pairKey);
      }
    }
  }
  
  // If we've met at least 80% of possible pairs, allow repeats
  return allMetPairs.size >= (maxPossiblePairs * 0.8);
};

// Generate matches using a random group algorithm (groups of 2 or 3, no groups of 1)
const getMatches = (members, previousMatches) => {
  const matches = [];
  const used = new Set();
  
  // Check if we should allow repeats
  const allowRepeats = allCombinationsExhausted(members, previousMatches);
  
  // Create a copy of members array and shuffle it randomly
  const shuffledMembers = [...members].sort(() => Math.random() - 0.5);
  
  let i = 0;
  while (i < shuffledMembers.length) {
    if (used.has(shuffledMembers[i])) {
      i++;
      continue;
    }
    
    const currentMatch = [shuffledMembers[i]];
    used.add(shuffledMembers[i]);
    
    // Calculate remaining members after this group
    const remainingAfterThisGroup = shuffledMembers.length - used.size;
    
    // Decide group size based on remaining members
    let groupSize;
    if (remainingAfterThisGroup === 0) {
      // Last person - try to make group of 2 or 3
      groupSize = Math.random() < 0.5 ? 2 : 3;
    } else if (remainingAfterThisGroup === 1) {
      // One person left after this group - make this group of 3 so we can split it
      groupSize = 3;
    } else {
      // Multiple people left - randomly choose 2 or 3
      groupSize = Math.random() < 0.6 && remainingAfterThisGroup >= 2 ? 3 : 2;
    }
    
    // Try to find additional members for the group
    let attempts = 0;
    while (currentMatch.length < groupSize && attempts < 50) {
      const randomIndex = Math.floor(Math.random() * shuffledMembers.length);
      const candidate = shuffledMembers[randomIndex];
      
      if (!used.has(candidate)) {
        // Check if this candidate can be paired with all current group members
        const canJoin = allowRepeats || currentMatch.every(member => 
          validPairing(member, candidate, previousMatches)
        );
        
        if (canJoin) {
          currentMatch.push(candidate);
          used.add(candidate);
        }
      }
      attempts++;
    }
    
    matches.push(currentMatch);
    i++;
  }
  
  // Post-process to ensure no groups of 1
  return ensureNoSingleGroups(matches, previousMatches, allowRepeats);
};

// Helper function to ensure no groups of 1 by splitting larger groups
const ensureNoSingleGroups = (matches, previousMatches, allowRepeats = false) => {
  const result = [];
  const singles = [];
  
  // Separate groups of 1 from other groups
  matches.forEach(match => {
    if (match.length === 1) {
      singles.push(match[0]);
    } else {
      result.push(match);
    }
  });
  
  // If we have singles, try to merge them with existing groups
  while (singles.length > 0) {
    const single = singles.shift();
    let merged = false;
    
    // Try to add to existing groups of 2
    for (let i = 0; i < result.length; i++) {
      if (result[i].length === 2) {
        const canJoin = allowRepeats || result[i].every(member => 
          validPairing(member, single, previousMatches)
        );
        
        if (canJoin) {
          result[i].push(single);
          merged = true;
          break;
        }
      }
    }
    
    // If couldn't merge, try to create a new group with another single
    if (!merged && singles.length > 0) {
      const anotherSingle = singles.shift();
      const canPair = allowRepeats || validPairing(single, anotherSingle, previousMatches);
      
      if (canPair) {
        result.push([single, anotherSingle]);
        merged = true;
      } else {
        // If they can't be paired, put them back and try to split a group of 3
        singles.unshift(anotherSingle);
        
        // Find a group of 3 and split it
        for (let i = 0; i < result.length; i++) {
          if (result[i].length === 3) {
            const groupOf3 = result[i];
            // Try different combinations to split the group
            for (let j = 0; j < groupOf3.length; j++) {
              const member1 = groupOf3[j];
              const member2 = groupOf3[(j + 1) % 3];
              const member3 = groupOf3[(j + 2) % 3];
              
              const canJoin1 = allowRepeats || validPairing(single, member1, previousMatches);
              const canJoin2 = allowRepeats || validPairing(anotherSingle, member2, previousMatches);
              
              if (canJoin1 && canJoin2) {
                result[i] = [member1, single];
                result.push([member2, anotherSingle]);
                result.push([member3]);
                singles.unshift(member3);
                merged = true;
                break;
              }
            }
            if (merged) break;
          }
        }
      }
    }
    
    // If still couldn't merge, force merge with any available group (when allowRepeats is true)
    if (!merged && allowRepeats) {
      // Find any group with space and force add the single
      for (let i = 0; i < result.length; i++) {
        if (result[i].length < 3) {
          result[i].push(single);
          merged = true;
          break;
        }
      }
    }
    
    // If still couldn't merge, force create a group by splitting the largest group
    if (!merged) {
      // Find the largest group and split it to accommodate the single
      let largestGroupIndex = -1;
      let largestGroupSize = 0;
      
      for (let i = 0; i < result.length; i++) {
        if (result[i].length > largestGroupSize) {
          largestGroupSize = result[i].length;
          largestGroupIndex = i;
        }
      }
      
      if (largestGroupIndex !== -1 && largestGroupSize >= 2) {
        const groupToSplit = result[largestGroupIndex];
        const member1 = groupToSplit[0];
        const member2 = groupToSplit[1];
        
        // Create two groups: [member1, single] and [member2]
        result[largestGroupIndex] = [member1, single];
        if (groupToSplit.length > 2) {
          result.push([member2, ...groupToSplit.slice(2)]);
        } else {
          result.push([member2]);
        }
        merged = true;
      }
    }
    
    // Last resort: force merge with any group, even if it makes it larger than 3
    if (!merged) {
      // Find any group and add the single to it
      if (result.length > 0) {
        result[0].push(single);
        merged = true;
      } else {
        // This should never happen, but if it does, create a group with just this single
        // and we'll handle it in the next iteration
        result.push([single]);
      }
    }
  }
  
  // Final cleanup: ensure no groups of 1 remain
  const finalResult = [];
  const remainingSingles = [];
  
  result.forEach(match => {
    if (match.length === 1) {
      remainingSingles.push(match[0]);
    } else {
      finalResult.push(match);
    }
  });
  
  // Force merge any remaining singles
  while (remainingSingles.length > 0) {
    const single = remainingSingles.shift();
    
    // Try to add to existing groups of 2
    let merged = false;
    for (let i = 0; i < finalResult.length; i++) {
      if (finalResult[i].length === 2) {
        finalResult[i].push(single);
        merged = true;
        break;
      }
    }
    
    // If no groups of 2, add to any group
    if (!merged && finalResult.length > 0) {
      finalResult[0].push(single);
    } else if (!merged) {
      // Last resort: create a group with another single if available
      if (remainingSingles.length > 0) {
        const anotherSingle = remainingSingles.shift();
        finalResult.push([single, anotherSingle]);
      } else {
        // This should never happen now
        finalResult.push([single]);
      }
    }
  }
  
  return finalResult;
};

// Format matches for display
const formatMatches = (matches, membersData, allowRepeats = false) => {
  let output = "🎯 **This Week's Matchy Meetups:**\n\n";
  
  if (allowRepeats) {
    output += "🔄 *Note: Allowing repeat matches as most unique combinations have been exhausted*\n\n";
  }
  
  if (matches.length === 0) {
    return output + "No matches found! Everyone might have already met each other.";
  }
  
  matches.forEach((match, index) => {
    const memberNames = match.map(slackId => {
      const member = membersData.members.find(m => m.slackId === slackId);
      return member ? `@${member.name}` : `@${slackId}`;
    });
    
    // Format based on group size
    let groupText;
    if (memberNames.length === 2) {
      groupText = `${memberNames[0]} & ${memberNames[1]}`;
    } else if (memberNames.length === 3) {
      groupText = `${memberNames[0]}, ${memberNames[1]} & ${memberNames[2]}`;
    } else {
      groupText = memberNames.join(", ");
    }
    
    output += `${index + 1}. ${groupText}\n`;
  });
  
  return output;
};

// Main function to add user who ran /matchy to JSON
const addUserToMatchy = async ({ ack, respond, command }) => {
  try {
    await ack();
    console.log("Adding user to matchy via /matchy command...");
    
    // Get the user who ran the command
    const userId = command?.user_id;
    
    if (!userId) {
      await respond("❌ Could not identify user. Please try again.");
      return;
    }
    
    // Load members data
    const membersData = loadMembersData();
    
    // Check if user already exists
    const existingMember = membersData.members.find(member => member.slackId === userId);
    
    if (existingMember) {
      await respond(`✅ You're already in the Matchy system!`);
      return;
    }
    
    // Get user info from Slack
    try {
      const userResult = await Bot.client.users.info({ user: userId });
      
      if (!userResult.ok || !userResult.user) {
        await respond("❌ Error fetching your user info. Please try again.");
        return;
      }
      
      const user = userResult.user;
      
      // Skip bots and deleted users
      if (user.is_bot || user.deleted) {
        await respond("❌ Bots cannot be added to Matchy.");
        return;
      }
      
      // Create new member object
      const newMember = {
        slackId: user.id,
        name: user.real_name || user.display_name || user.name || "Unknown",
        role: "MEMBER",
        repos: [],
        github: "",
        rep: 0,
        matchyEnabled: true
      };
      
      // Add to members array
      membersData.members.push(newMember);
      
      // Save to JSON file
      saveMembersData(membersData);
      
      console.log(`✅ Added new member to JSON: ${newMember.name} (@${userId})`);
      await respond(`✅ You've been added to the Matchy system!\n\nYour profile:\n• Name: ${newMember.name}\n• Matchy Enabled: Yes\n\nYou'll now be included in weekly matchy meetups! 🎉`);
      
    } catch (error) {
      console.error(`Error fetching user info for ${userId}:`, error);
      await respond("❌ Error adding you to Matchy. Check the logs for details.");
    }
    
  } catch (error) {
    console.error("Error in generateMatchyMeetups:", error);
    await respond("❌ Error processing /matchy command. Check the logs for details.");
  }
};

// Function to actually generate and create matches (used by scheduled jobs)
const generateMatches = async ({ respond }) => {
  try {
    console.log("Generating Matchy meetups...");
    
    const membersData = loadMembersData();
    const members = getMembersFromJSON();
    const previousMatches = getPreviousMatches();
    
    console.log("Available members:", members);
    console.log("Previous matches:", previousMatches);
    
    if (members.length < 2) {
      const message = "❌ Not enough members enabled for Matchy! Need at least 2 people.";
      if (respond) {
        await respond(message);
      } else {
        console.log(message);
      }
      return;
    }
    
    // Generate matches
    const currentMatches = getMatches(members, previousMatches);
    
    // Check if repeats were allowed for this round
    const allowRepeats = allCombinationsExhausted(members, previousMatches);
    
    // Automatically create group chats
    await createGroupChats(currentMatches, membersData, respond, allowRepeats);
    
    console.log("Generated and created matches:", currentMatches);
    
  } catch (error) {
    console.error("Error in generateMatches:", error);
    if (respond) {
      await respond("❌ Error generating matches. Check the logs for details.");
    }
  }
};

// Automatically create group chats for matches
const createGroupChats = async (matches, membersData, respond, allowRepeats) => {
  try {
    const previousMatches = getPreviousMatches();
    
    // Update previous matches
    updatePreviousMatches(matches, previousMatches);
    
    // Create group chats for each match
    const createdGroups = [];
    
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      
      try {
        // Create group DM
        const groupResult = await Bot.client.conversations.open({
          users: match.join(',')
        });
        
        if (groupResult.ok) {
          const channelId = groupResult.channel.id;
          createdGroups.push({
            channelId: channelId,
            members: match,
            memberNames: match.map(slackId => {
              const member = membersData.members.find(m => m.slackId === slackId);
              return member ? member.name : slackId;
            })
          });
          
          // Send welcome message to the group
          const welcomeMessage = createWelcomeMessage();
          await Bot.client.chat.postMessage({
            channel: channelId,
            text: welcomeMessage
          });
        }
      } catch (error) {
        console.error(`Error creating group for match ${i + 1}:`, error);
      }
    }
    
    // Send summary to the channel
    let output = `🎯 *Matchy Meetups Created!*\n\n`;
    
    if (allowRepeats) {
      output += `🔄 *Note: Allowing repeat matches as most unique combinations have been exhausted*\n\n`;
    }
    
    createdGroups.forEach((group, index) => {
      const memberNames = group.memberNames.join(", ");
      output += `${index + 1}. *Group ${index + 1}:* ${memberNames}\n`;
    });
    
    output += `\n*Summary:*\n`;
    output += `• ${createdGroups.length} group chats created\n`;
    output += `• ${matches.reduce((sum, match) => sum + match.length, 0)} people matched\n`;
    output += `• Previous matches updated\n`;
    output += `• Welcome messages sent to each group\n`;
    
    await respond(output);
    
    console.log(`Successfully created ${createdGroups.length} group chats`);
    
  } catch (error) {
    console.error("Error creating group chats:", error);
    await respond("❌ Error creating group chats. Check the logs for details.");
  }
};


// Clear all previous matches (for testing)
const clearMatchy = async ({ ack, respond }) => {
  try {
    await ack();
    
    const data = loadMembersData();
    data.previousMatches = {};
    saveMembersData(data);
    
    await respond("🧹 Cleared all previous Matchy matches!");
    
  } catch (error) {
    console.error("Error clearing matches:", error);
    await respond("❌ Error clearing matches. Check the logs for details.");
  }
};

// Load and display member data
const loadMembersDataCommand = async ({ ack, respond }) => {
  try {
    await ack();
    
    const data = loadMembersData();
    const members = data.members || [];
    const previousMatches = data.previousMatches || {};
    
    let output = "📊 **Member Data Loaded:**\n\n";
    
    if (members.length === 0) {
      output += "⚠️ **No members found in data file!**\n";
      output += "The members.json file appears to be empty or corrupted.\n\n";
      output += "**Expected structure:**\n";
      output += "```json\n";
      output += "{\n";
      output += "  \"members\": [\n";
      output += "    {\n";
      output += "      \"slackId\": \"U1234567890\",\n";
      output += "      \"name\": \"John Doe\",\n";
      output += "      \"role\": \"MEMBER\",\n";
      output += "      \"matchyEnabled\": true\n";
      output += "    }\n";
      output += "  ],\n";
      output += "  \"previousMatches\": {}\n";
      output += "}\n";
      output += "```";
    } else {
      output += `**Total Members:** ${members.length}\n`;
      output += `**Matchy Enabled:** ${members.filter(m => m.matchyEnabled).length}\n`;
      output += `**Matchy Disabled:** ${members.filter(m => !m.matchyEnabled).length}\n\n`;
      
      // Show first few members as preview
      output += "**Preview (first 5 members):**\n";
      members.slice(0, 5).forEach((member, index) => {
        output += `${index + 1}. ${member.name || 'Unknown'} (${member.role || 'Unknown'}) - ${member.matchyEnabled ? '✅' : '❌'}\n`;
      });
      
      if (members.length > 5) {
        output += `... and ${members.length - 5} more members\n`;
      }
      
      output += `\n**Previous Matches:** ${Object.keys(previousMatches).length} members have match history\n`;
    }
    
    await respond(output);
    
    console.log(`Loaded member data: ${members.length} total members`);
    
  } catch (error) {
    console.error("Error loading member data:", error);
    await respond("❌ Error loading member data. Check the logs for details.");
  }
};

// Add new members to JSON when they join the channel (no auto-approval)
const addNewMemberToJSON = async (userId) => {
  try {
    console.log(`New member joined: ${userId}`);
    
    // Get user info
    const userResult = await Bot.client.users.info({
      user: userId
    });
    
    if (!userResult.ok || !userResult.user) {
      console.error(`Error fetching user info for ${userId}:`, userResult.error);
      return;
    }
    
    const user = userResult.user;
    
    // Skip bots and deleted users
    if (user.is_bot || user.deleted) {
      console.log(`Skipping bot/deleted user: ${userId}`);
      return;
    }
    
    // Create new member object
    const newMember = {
      slackId: user.id,
      name: user.real_name || user.display_name || user.name || "Unknown",
      role: "MEMBER", // Default role
      repos: [], // Empty initially
      github: "", // Empty initially
      rep: 0, // Default rep
      matchyEnabled: true // Auto-enable for new members
    };
    
    // Load existing data
    const data = loadMembersData();
    
    // Check if user already exists
    const existingMember = data.members.find(member => member.slackId === userId);
    if (existingMember) {
      console.log(`User ${userId} already exists in members list`);
      return;
    }
    
    // Add new member
    data.members.push(newMember);
    
    // Save updated data
    saveMembersData(data);
    
    console.log(`✅ Added new member to JSON: ${newMember.name} (@${userId})`);
    
    // Send notification to channel
    // try {
    //   await Bot.client.chat.postMessage({
    //     channel: "C01FL4VCE1Z", // The matchy channel
    //     text: `🎉 **Welcome to Matchy!**\n\n**${newMember.name}** has joined the channel and been automatically added to the matchy system!\n\nThey're now eligible for weekly meetups. 👋`
    //   });
    // } catch (error) {
    //   console.error("Error sending welcome message:", error);
    // }
    
  } catch (error) {
    console.error("Error adding new member to JSON:", error);
  }
};

// Handle button actions for user approval
const handleUserApproval = async ({ ack, respond, action }) => {
  try {
    await ack();
    
    if (currentUserIndex >= pendingUsers.length) {
      await respond("❌ No more users to process.");
      return;
    }
    
    const user = pendingUsers[currentUserIndex];
    
    switch (action.action_id) {
      case "approve_user":
        user.approved = true;
        await respond(`✅ **Approved:** ${user.name} (@${user.slackId})`);
        break;
      case "decline_user":
        user.approved = false;
        await respond(`❌ **Declined:** ${user.name} (@${user.slackId})`);
        break;
      case "skip_user":
        // Leave approved as undefined (skipped)
        await respond(`⏭️ **Skipped:** ${user.name} (@${user.slackId})`);
        break;
    }
    
    // Move to next user
    currentUserIndex++;
    
    // Show next user or summary
    if (currentUserIndex < pendingUsers.length) {
      await showUserForApproval(respond);
    } else {
      await showApprovalSummary(respond);
    }
    
  } catch (error) {
    console.error("Error handling user approval:", error);
    await respond("❌ Error processing approval. Check the logs for details.");
  }
};


module.exports = {
  addUserToMatchy,
  generateMatches,
  clearMatchy,
  loadMembersDataCommand,
  fetchChannelUsers,
  handleUserApproval,
  addNewMemberToJSON,
};
