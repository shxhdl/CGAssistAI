import fs from "fs";
import https from "https";

const url = "https://shabiba.eu-central-1.linodeobjects.com/2024/01/1706597254-1706597254-3upubmp9twqs.jpg";
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
