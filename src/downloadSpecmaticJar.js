const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const packageJson = require('../package.json');

const MAX_TRANSIENT_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

function isTransientDownloadError(error) {
  const status = error.response && error.response.status;
  return status === 429 || (status >= 500 && status < 600);
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function downloadSpecmaticJar(
  version = packageJson.specmaticVersion,
  downloadPath = path.resolve(__dirname, '..', 'specmatic.jar'),
) {
  const artifactPath = `io/specmatic/specmatic-executable-all/${version}/specmatic-executable-all-${version}.jar`;
  const urls = [
    `https://github.com/specmatic/specmatic/releases/download/${version}/specmatic.jar`,
    `https://repo.specmatic.io/releases/${artifactPath}`,
    `https://repo.maven.apache.org/maven2/${artifactPath}`,
  ];
  const failures = [];

  for (const url of urls) {
    console.log(`Downloading Specmatic jar from: ${url}`);
    const temporaryDirectory = await fs.promises.mkdtemp(path.join(path.dirname(downloadPath), '.specmatic-'));
    const temporaryPath = path.join(temporaryDirectory, 'specmatic.jar');
    try {
      for (let attempt = 0; attempt <= MAX_TRANSIENT_RETRIES; attempt++) {
        try {
          const response = await axios({
            method: 'get',
            url,
            responseType: 'stream',
            timeout: 60000,
          });
          await pipeline(response.data, fs.createWriteStream(temporaryPath));
          await fs.promises.rename(temporaryPath, downloadPath);
          console.log(`Successfully downloaded Specmatic JAR from: ${url}`);
          return;
        } catch (error) {
          // Axios also exposes a response stream for HTTP errors. Release it before retrying.
          if (error.response && error.response.data && error.response.data.destroy) {
            error.response.data.destroy();
          }
          if (!isTransientDownloadError(error) || attempt === MAX_TRANSIENT_RETRIES) {
            throw error;
          }
          const delay = RETRY_DELAY_MS * (attempt + 1);
          console.warn(`Download failed from ${url}: ${error.message}. Retrying in ${delay / 1000} seconds...`);
          await wait(delay);
        }
      }
    } catch (error) {
      failures.push(`${url}: ${error.message}`);
      console.error(`Download failed from ${url}: ${error.message}`);
    } finally {
      await fs.promises.rm(temporaryDirectory, { recursive: true, force: true });
    }
  }

  throw new Error(`Unable to download Specmatic JAR version ${version} from any source:\n${failures.join('\n')}`);
}

if (require.main === module) {
  downloadSpecmaticJar().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { downloadSpecmaticJar };
