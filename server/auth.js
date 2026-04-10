const { chromium } = require('playwright');
require('dotenv').config({ path: '../.env' });

async function loginToSolar() {
    console.log('[AUTH] Starting Playwright browser...');
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--foreground']
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.bringToFront();

    try {
        await page.goto('https://solar.feutech.edu.ph/');
        await page.bringToFront();

        // Check if we are redirected to Microsoft
        await page.waitForURL(/login\.microsoftonline/);
        await page.bringToFront();

        console.log('[AUTH] Entering credentials...');
        await page.fill('input[type="email"]', process.env.SOLAR_USERNAME);
        await page.click('input[type="submit"]');
        
        await page.waitForTimeout(1000);
        await page.fill('input[type="password"]', process.env.SOLAR_PASSWORD);
        await page.click('input[type="submit"]');

        // Wait for Microsoft Login flow to settle
        console.log('[AUTH] Waiting for Microsoft Authenticator page (if any)...');
        await page.waitForTimeout(2000); // Give it a brief moment
        await page.bringToFront();

        // Inject Overlay
        console.log('[AUTH] Injecting FEU Guidance Overlay...');
        await page.evaluate(() => {
            const overlay = document.createElement('div');
            overlay.id = 'feu-mfa-overlay';
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.85); z-index: 999999;
                display: flex; align-items: center; justify-content: center;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                backdrop-filter: blur(8px);
            `;
            
            overlay.innerHTML = `
                <div style="background: white; padding: 40px; border-radius: 24px; text-align: center; max-width: 450px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border: 4px solid #1a7a3f;">
                    <div style="font-size: 60px; margin-bottom: 20px;">📱</div>
                    <h2 style="color: #1a7a3f; margin-bottom: 15px; font-size: 28px; font-weight: 800;">Approve Sign In</h2>
                    <p style="color: #4a5568; line-height: 1.6; font-size: 16px; margin-bottom: 30px;">
                        Please approve the <b>Microsoft Authenticator</b> notification on your phone.<br><br>
                        Click <b>Continue</b> once you have approved it.
                    </p>
                    <button id="mfa-continue" style="background: #1a7a3f; color: white; border: none; padding: 16px 40px; border-radius: 12px; font-size: 18px; font-weight: bold; cursor: pointer; transition: transform 0.2s; width: 100%;">
                        Continue
                    </button>
                </div>
            `;
            document.body.appendChild(overlay);
        });

        await page.evaluate(() => {
            document.getElementById('mfa-continue').onclick = () => {
                document.getElementById('feu-mfa-overlay').remove();
            };
        });

        console.log('[AUTH] Waiting for user to click Continue on overlay...');
        await page.waitForFunction(() => !document.getElementById('feu-mfa-overlay'), { timeout: 300000 });
        
        console.log('[AUTH] Checking for "Stay signed in?" prompt...');
        try {
            // Wait a moment for Microsoft's post-MFA screen
            await page.waitForSelector('#idSIButton9', { timeout: 10000 });
            console.log('[AUTH] Clicking "Stay signed in"...');
            await page.click('#idSIButton9');
        } catch (e) {
            console.log('[AUTH] No "Stay signed in" prompt found, proceeding...');
        }
        
        console.log('[AUTH] Waiting for SOLAR redirection...');
        await page.waitForURL(/solar\.feutech\.edu\.ph/, { timeout: 120000 });
        
        // Land on offerings page to ensure cookies are initialized for that path
        console.log('[AUTH] Landing on offerings page...');
        await page.goto('https://solar.feutech.edu.ph/course/offerings', { waitUntil: 'networkidle' });
        
        const cookies = await context.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        
        console.log('[AUTH] Successfully authenticated!');
        await browser.close();
        return cookieString;

    } catch (err) {
        console.error('[AUTH] Login failed:', err);
        await browser.close();
        throw err;
    }
}

module.exports = { loginToSolar };
