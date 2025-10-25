const Bot = require("./bot");
const fs = require("fs");
const path = require("path");

// Load members data from JSON file
const loadMembersData = () => {
  try {
    const dataPath = path.join(__dirname, "../data/members.json");
    const data = fs.readFileSync(dataPath, "utf8");
    return JSON.parse(data);
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

// Generate matches using a random group algorithm (groups of 2 or 3, no groups of 1)
const getMatches = (members, previousMatches) => {
  const matches = [];
  const used = new Set();
  
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
        const canJoin = currentMatch.every(member => 
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
  return ensureNoSingleGroups(matches, previousMatches);
};

// Helper function to ensure no groups of 1 by splitting larger groups
const ensureNoSingleGroups = (matches, previousMatches) => {
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
        const canJoin = result[i].every(member => 
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
      if (validPairing(single, anotherSingle, previousMatches)) {
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
              
              if (validPairing(single, member1, previousMatches) && 
                  validPairing(anotherSingle, member2, previousMatches)) {
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
    
    // If still couldn't merge, add as single (this shouldn't happen often)
    if (!merged) {
      result.push([single]);
    }
  }
  
  return result;
};

// Format matches for display
const formatMatches = (matches, membersData) => {
  let output = "🎯 **This Week's Matchy Meetups:**\n\n";
  
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

// Main function to generate and display matches
const generateMatchyMeetups = async ({ ack, respond }) => {
  try {
    await ack();
    console.log("Generating Matchy meetups...");
    
    const membersData = loadMembersData();
    const members = getMembersFromJSON();
    const previousMatches = getPreviousMatches();
    
    console.log("Available members:", members);
    console.log("Previous matches:", previousMatches);
    
    if (members.length < 2) {
      await respond("❌ Not enough members enabled for Matchy! Need at least 2 people.");
      return;
    }
    
    // Generate matches
    const currentMatches = getMatches(members, previousMatches);
    
    // Update previous matches
    updatePreviousMatches(currentMatches, previousMatches);
    
    // Format and send response
    const formattedMatches = formatMatches(currentMatches, membersData);
    await respond(formattedMatches);
    
    console.log("Generated matches:", currentMatches);
    
  } catch (error) {
    console.error("Error in generateMatchyMeetups:", error);
    await respond("❌ Error generating matches. Check the logs for details.");
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

module.exports = {
  generateMatchyMeetups,
  clearMatchy,
};
