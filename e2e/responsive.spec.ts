import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'Mobile Portrait', width: 375, height: 667 },
  { name: 'Mobile Landscape', width: 667, height: 375 },
  { name: 'Tablet Portrait', width: 768, height: 1024 },
  { name: 'Tablet Landscape', width: 1024, height: 768 },
  { name: 'Desktop Small', width: 1280, height: 720 },
  { name: 'Desktop Large', width: 1920, height: 1080 },
];

test.describe('Responsive Design Tests', () => {
  viewports.forEach(viewport => {
    test(`should display correctly on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Take screenshot for visual comparison
      await page.screenshot({ 
        path: `test-results/responsive-${viewport.name.toLowerCase().replace(' ', '-')}.png`,
        fullPage: true 
      });
      
      // Check that main content is visible
      await expect(page.getByText('丁二烯C班點餐系統')).toBeVisible();
      
      // Check that content doesn't overflow horizontally
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 20); // Allow small margin
      
      // Check that interactive elements are appropriately sized
      const buttons = await page.locator('button').all();
      for (const button of buttons.slice(0, 3)) {
        if (await button.isVisible()) {
          const boundingBox = await button.boundingBox();
          if (boundingBox) {
            // Buttons should be at least 44px tall on mobile for touch targets
            if (viewport.width <= 768) {
              expect(boundingBox.height).toBeGreaterThanOrEqual(40);
            }
          }
        }
      }
    });
  });

  test('should handle orientation changes gracefully', async ({ page }) => {
    // Start in portrait mode
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify content is visible in portrait
    await expect(page.getByText('丁二烯C班點餐系統')).toBeVisible();
    
    // Switch to landscape mode
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(500); // Allow for reflow
    
    // Verify content is still visible and properly laid out
    await expect(page.getByText('丁二烯C班點餐系統')).toBeVisible();
    
    // Check that content doesn't overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(667 + 20);
  });

  test('should have touch-friendly interface on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check touch target sizes
    const interactiveElements = await page.locator('button, a, input, [role="button"]').all();
    
    for (const element of interactiveElements) {
      if (await element.isVisible()) {
        const boundingBox = await element.boundingBox();
        if (boundingBox) {
          // Touch targets should be at least 44x44px
          expect(boundingBox.width).toBeGreaterThanOrEqual(40);
          expect(boundingBox.height).toBeGreaterThanOrEqual(40);
        }
      }
    }
    
    // Check spacing between interactive elements
    const buttons = await page.locator('button').all();
    for (let i = 0; i < buttons.length - 1; i++) {
      const button1 = buttons[i];
      const button2 = buttons[i + 1];
      
      if (await button1.isVisible() && await button2.isVisible()) {
        const box1 = await button1.boundingBox();
        const box2 = await button2.boundingBox();
        
        if (box1 && box2) {
          // Calculate distance between buttons
          const distance = Math.min(
            Math.abs(box1.x - (box2.x + box2.width)),
            Math.abs(box2.x - (box1.x + box1.width)),
            Math.abs(box1.y - (box2.y + box2.height)),
            Math.abs(box2.y - (box1.y + box1.height))
          );
          
          // Buttons should have adequate spacing (at least 8px)
          if (distance < 100) { // Only check if buttons are close
            expect(distance).toBeGreaterThanOrEqual(8);
          }
        }
      }
    }
  });

  test('should adapt navigation for different screen sizes', async ({ page }) => {
    // Test desktop navigation
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if navigation is visible on desktop
    const desktopNav = await page.locator('nav, [role="navigation"]').count();
    
    // Test mobile navigation
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Check if mobile navigation adapts (hamburger menu, etc.)
    const mobileNavTrigger = await page.locator('[aria-label*="menu"], [aria-expanded]').count();
    
    // Navigation should adapt to screen size
    expect(desktopNav > 0 || mobileNavTrigger > 0).toBe(true);
  });

  test('should handle text scaling appropriately', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test with different text scaling
    const textScales = [1, 1.5, 2];
    
    for (const scale of textScales) {
      // Simulate text scaling
      await page.addStyleTag({
        content: `
          * {
            font-size: ${scale}em !important;
          }
        `
      });
      
      await page.waitForTimeout(500);
      
      // Check that content is still readable and doesn't overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      
      // Allow some overflow for larger text scales
      const allowedOverflow = scale > 1.5 ? 100 : 20;
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + allowedOverflow);
      
      // Check that text is still visible
      await expect(page.getByText('丁二烯C班點餐系統')).toBeVisible();
    }
  });

  test('should maintain functionality across breakpoints', async ({ page }) => {
    const testViewports = [
      { width: 375, height: 667 },  // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1280, height: 720 }  // Desktop
    ];
    
    for (const viewport of testViewports) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Test core functionality at each breakpoint
      // Skip to ordering interface
      const skipRestaurant = page.getByText('今天不用餐');
      if (await skipRestaurant.isVisible()) {
        await skipRestaurant.click();
      }
      
      const skipDrinks = page.getByText('今天不訂飲料');
      if (await skipDrinks.isVisible()) {
        await skipDrinks.click();
      }
      
      // Test adding a member
      const addMemberButton = page.getByText('新增臨時成員');
      if (await addMemberButton.isVisible()) {
        await addMemberButton.click();
        
        const memberInput = page.getByPlaceholder('輸入臨時成員姓名');
        if (await memberInput.isVisible()) {
          await memberInput.fill(`測試用戶_${viewport.width}`);
          
          const confirmButton = page.getByText('確認新增');
          if (await confirmButton.isVisible()) {
            await confirmButton.click();
            
            // Verify member was added
            await expect(page.getByText(`測試用戶_${viewport.width}`)).toBeVisible();
          }
        }
      }
    }
  });

  test('should handle content overflow gracefully', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 }); // Very small screen
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for horizontal scrollbars (should be minimal)
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });
    
    // Small amount of overflow might be acceptable
    if (hasHorizontalScroll) {
      const overflowAmount = await page.evaluate(() => {
        return document.body.scrollWidth - window.innerWidth;
      });
      expect(overflowAmount).toBeLessThan(50); // Less than 50px overflow
    }
    
    // Check that content is still accessible
    await expect(page.getByText('丁二烯C班點餐系統')).toBeVisible();
  });

  test('should display images responsively', async ({ page }) => {
    const testViewports = [
      { width: 375, height: 667 },
      { width: 1280, height: 720 }
    ];
    
    for (const viewport of testViewports) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const images = await page.locator('img').all();
      
      for (const img of images) {
        if (await img.isVisible()) {
          const boundingBox = await img.boundingBox();
          if (boundingBox) {
            // Images should not exceed viewport width
            expect(boundingBox.width).toBeLessThanOrEqual(viewport.width);
            
            // Images should maintain aspect ratio
            const naturalDimensions = await img.evaluate(el => ({
              naturalWidth: (el as HTMLImageElement).naturalWidth,
              naturalHeight: (el as HTMLImageElement).naturalHeight
            }));
            
            if (naturalDimensions.naturalWidth > 0 && naturalDimensions.naturalHeight > 0) {
              const naturalRatio = naturalDimensions.naturalWidth / naturalDimensions.naturalHeight;
              const displayRatio = boundingBox.width / boundingBox.height;
              
              // Allow small variance in aspect ratio
              expect(Math.abs(naturalRatio - displayRatio)).toBeLessThan(0.1);
            }
          }
        }
      }
    }
  });

  test('should handle form layouts responsively', async ({ page }) => {
    const testViewports = [
      { width: 375, height: 667 },  // Mobile
      { width: 1280, height: 720 }  // Desktop
    ];
    
    for (const viewport of testViewports) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Find form elements
      const inputs = await page.locator('input, textarea').all();
      const labels = await page.locator('label').all();
      
      for (const input of inputs) {
        if (await input.isVisible()) {
          const inputBox = await input.boundingBox();
          if (inputBox) {
            // Form inputs should be appropriately sized
            if (viewport.width <= 768) {
              // On mobile, inputs should be large enough for touch
              expect(inputBox.height).toBeGreaterThanOrEqual(40);
            }
            
            // Inputs should not exceed container width
            expect(inputBox.width).toBeLessThanOrEqual(viewport.width - 40); // Account for padding
          }
        }
      }
    }
  });
});
