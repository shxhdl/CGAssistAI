import fs from "fs";
import https from "https";

const url = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Gulf_College_Oman.jpg/1280px-Gulf_College_Oman.jpg";
const dest = "./public/gulf-college-bg.jpg";

https.get(url, (res) => {
  if (res.statusCode !== 200) {
    console.error("Failed to download image:", res.statusCode);
    return;
  }
  
  const file = fs.createWriteStream(dest);
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log("Successfully downloaded Gulf College image to public folder!");
  });
}).on('error', (err) => {
  console.error("Error downloading image:", err.message);
});
