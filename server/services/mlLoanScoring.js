const path = require('path');
const { spawn } = require('child_process');

const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || 'python';
const SCRIPT_PATH = path.resolve(__dirname, '../../ml_model/loan_model_service.py');

const runPythonService = (args, payload) =>
  new Promise((resolve, reject) => {
    const child = spawn(PYTHON_EXECUTABLE, [SCRIPT_PATH, ...args], {
      cwd: path.resolve(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(new Error(`Unable to start Python ML service: ${error.message}`));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Python ML service exited with code ${code}${stderr ? `: ${stderr.trim()}` : ''}`,
          ),
        );
        return;
      }

      try {
        resolve(JSON.parse(stdout || '{}'));
      } catch (error) {
        reject(
          new Error(
            `Python ML service returned invalid JSON${stderr ? `: ${stderr.trim()}` : ''}`,
          ),
        );
      }
    });

    if (payload !== undefined) {
      child.stdin.write(JSON.stringify(payload));
    }
    child.stdin.end();
  });

const analyzeStatement = async (pdfPath) =>
  runPythonService(['analyze-statement', '--pdf', path.resolve(pdfPath)]);

const scoreLoanApplication = async (applicationPayload) => runPythonService(['score'], applicationPayload);

module.exports = {
  analyzeStatement,
  scoreLoanApplication,
};
