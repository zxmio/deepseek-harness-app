const { app, BrowserWindow, dialog, shell } = require('electron');
const { spawn } = require('child_process');
const net = require('net');
const http = require('http');
const path = require('path');
const fs = require('fs');

let dshProcess = null;
let mainWindow = null;
let serverUrl = null;

const DSH_BIN = path.join(__dirname, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js');

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const probe = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() > deadline) {
          reject(new Error(`dsh web 在 ${timeoutMs / 1000} 秒内没有就绪`));
        } else if (dshProcess && dshProcess.exitCode !== null) {
          reject(new Error(`dsh 进程异常退出（exit code ${dshProcess.exitCode}），详见日志`));
        } else {
          setTimeout(probe, 300);
        }
      });
      req.setTimeout(2000, () => req.destroy());
    };
    probe();
  });
}

function startDsh(port, logStream) {
  // Electron 二进制以 ELECTRON_RUN_AS_NODE=1 运行时等价于同版本 Node，
  // 免去在 App 里单独捆绑一份 Node 运行时
  const child = spawn(
    process.execPath,
    [DSH_BIN, 'web', '--host', '127.0.0.1', '--port', String(port)],
    {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);
  return child;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    title: 'DeepSeek Harness',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 外部链接交给系统浏览器，窗口内只留 dsh UI
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.loadURL(serverUrl);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function boot() {
  const logPath = path.join(app.getPath('userData'), 'dsh.log');
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  logStream.write(`\n===== DeepSeek Harness App 启动 ${new Date().toISOString()} =====\n`);

  try {
    const port = await getFreePort();
    serverUrl = `http://127.0.0.1:${port}`;
    dshProcess = startDsh(port, logStream);
    dshProcess.on('exit', (code) => {
      logStream.write(`dsh 进程退出，code=${code}\n`);
      // 窗口还开着说明不是正常退出流程，提示用户
      if (mainWindow && !app.isQuittingDsh) {
        dialog.showErrorBox(
          'dsh 服务已停止',
          `后台 dsh 进程意外退出（code ${code}）。\n日志：${logPath}`
        );
      }
    });
    await waitForServer(serverUrl, 60000);
    createWindow();
  } catch (err) {
    dialog.showErrorBox('启动失败', `${err.message}\n日志：${logPath}`);
    app.quit();
  }
}

app.whenReady().then(boot);

app.on('activate', () => {
  // macOS 惯例：点 Dock 图标时若无窗口则重开
  if (mainWindow === null && serverUrl) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  // macOS 惯例：关窗不退出，dsh 服务保持在后台
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuittingDsh = true;
  if (dshProcess && dshProcess.exitCode === null) {
    dshProcess.kill('SIGTERM');
  }
});
