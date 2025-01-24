# speed-screen
 A Google Sheet and App Script to speed up party screening

 # caveat
 _I am not a coder_, and as such, this script is _NASTY_. This is not intended to be run in production on a Google Spreadsheet, it exists only as a proof of concept. I would prefer that Rice students own the challenge of seeding up the party entry system and develop a more elegant solution like an app.

 ## limitations
 There's all kinds of ways to make this not work... the mag stripe input can not match the regex pattern, the user might have the wrong box selected when they swipe, the student IDs can be corrupted or mis-entered, _THIS JANKY THING DOESN'T EVEN WORK ON MOBILE DEVICES!_
 In order for this to work, it needs to be overhauled and probably built into a web app.
 ## disclaimer
 If you're dumb enough to use this in a live production environment with real students and a long line, may God have mercy on your soul. I'm not responsible for the clusterf*** you will unleash on your event.

 # how to use it
  1. Download a copy of the sample sheet and copy it into your drive: https://docs.google.com/spreadsheets/d/1e6qBAB4X6O0tXttSj12zBEndkn6wVT49kb-FmMs1P_o/edit?usp=sharing 
  >(note: all the "student" data in this sheet is randomly generated and does not represent actual people. if any of these netIDs are real, it is a total coincidence.)
  2. Go to Extensions > Apps Script and create three files matching the filenames in this repository
  3. Copy the contents of each file into their respective files in Apps Script
  4. Execute the main workflow script. it will error out, but that's OK.
  5. Switch to the "Party entry" tab in the sheet and click on the "ENTER ID" button to start the script.

 # tools and equipment
 This script uses a simple mag stripe reader you can purchase for $15. They act as HID keyboards and type the values they scan into the cursor position.

 # how it works
 The script uses RegEx to parse the string passed by the mag reader (or a manually-entered valid student ID) and hashes it. It then checks the hash against a list of hashed values generated based on the student ID numbers in the "Registered students" sheet, and starts the screening process.
 ## settings
 What happens within the screning loop is determined by the settings tab. Activating or adding screening questions, updating references if you've edited the PArty entry sheet, abd editing the error, log, nd user messages all happens here.
