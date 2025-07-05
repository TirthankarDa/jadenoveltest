// public/scripts/settings-loader.js
(function() {
    const settings = {
        theme: localStorage.getItem('readingTheme') || 'light',
        fontSize: localStorage.getItem('readingFontSize') || '18', // store as px
        fontFamily: localStorage.getItem('readingFontFamily') || 'serif',
    };

    const root = document.documentElement;

    // Apply font size and family directly
    root.style.setProperty('--font-size', `${settings.fontSize}px`);
    root.style.setProperty('--font-family', settings.fontFamily === 'serif' ? 'Georgia, serif' : 'Helvetica, Arial, sans-serif');

    // Apply theme colors
    if (settings.theme === 'dark') {
        root.style.setProperty('--theme-bg', '#121212');
        root.style.setProperty('--theme-text', '#E0E0E0');
        root.style.setProperty('--theme-text-secondary', '#BDBDBD');
        root.style.setProperty('--theme-border', '#333333');
        root.style.setProperty('--theme-link', '#90CAF9');
    } else if (settings.theme === 'sepia') {
        root.style.setProperty('--theme-bg', '#FBF0D9');
        root.style.setProperty('--theme-text', '#5B4636');
        root.style.setProperty('--theme-text-secondary', '#8D6E63');
        root.style.setProperty('--theme-border', '#D7C8B6');
        root.style.setProperty('--theme-link', '#8D6E63');
    }
    // 'light' is the default in CSS, so no need for an else block.
})();