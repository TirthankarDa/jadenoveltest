<script>
    // --- THIS SCRIPT BLOCK IS UNCHANGED ---
    import { onMount } from 'svelte';
    import { 
        theme, 
        fontSize, 
        fontFamily, 
        isInfiniteScroll,
        changeTheme,
        changeFontFamily,
        changeFontSize,
        changeInfiniteScroll
    } from '../stores/settingsStore.js';

    // === STATE MANAGEMENT ===
    let currentTheme = $state(theme.get());
    let currentFontSize = $state(fontSize.get());
    let currentFontFamily = $state(fontFamily.get());
    let currentInfiniteScroll = $state(isInfiniteScroll.get());
    let isPanelOpen = $state(false);
    let isChapterListOpen = $state(false);
    let chapters = $state([]);
    let currentBook = $state(null);
    let currentChapter = $state(null);
    let intersectionObserver = null;
    let isFetching = $state(false);
    
    // === EVENT HANDLERS ===
    function handleToggleSettings() {
        isPanelOpen = !isPanelOpen;
    }

    function handleToggleChapterList() {
        isChapterListOpen = !isChapterListOpen;
    }

    function handleClickOutside(event) {
        if (isPanelOpen && !event.target.closest('.settings-panel') && !event.target.closest('#bottom-settings-toggle')) {
            isPanelOpen = false;
        }
        if (isChapterListOpen && !event.target.closest('.chapter-list-panel') && !event.target.closest('#chapter-list-toggle')) {
            isChapterListOpen = false;
        }
    }

    // --- Store Subscription ---
    onMount(() => {
        const unsubTheme = theme.subscribe(v => currentTheme = v);
        const unsubFontSize = fontSize.subscribe(v => currentFontSize = v);
        const unsubFontFamily = fontFamily.subscribe(v => currentFontFamily = v);
        const unsubInfinite = isInfiniteScroll.subscribe(v => currentInfiniteScroll = v);
        
        document.addEventListener('toggle-settings', handleToggleSettings);
        document.addEventListener('toggle-chapter-list', handleToggleChapterList);
        document.addEventListener('click', handleClickOutside);
        
        // Get current book and chapter info from the page
        const bookInfo = document.querySelector('#book-info');
        if (bookInfo) {
            currentBook = JSON.parse(bookInfo.textContent);
        }
        
        const chapterInfo = document.querySelector('#chapter-info');
        if (chapterInfo) {
            currentChapter = JSON.parse(chapterInfo.textContent);
        }
        
        const chaptersData = document.querySelector('#chapters-data');
        if (chaptersData) {
            chapters = JSON.parse(chaptersData.textContent);
        }
        
        return () => {
            unsubTheme();
            unsubFontSize();
            unsubFontFamily();
            unsubInfinite();
            if (intersectionObserver) intersectionObserver.disconnect();
            document.removeEventListener('toggle-settings', handleToggleSettings);
            document.removeEventListener('toggle-chapter-list', handleToggleChapterList);
            document.removeEventListener('click', handleClickOutside);
        };
    });


    // === DOM EFFECTS ===
   $effect(() => {
        const root = document.documentElement;

        // --- Apply Global Theme ---
        // This logic is still necessary to set the CSS variables that Tailwind will use.
        if (currentTheme === 'dark') {
            root.style.setProperty('--theme-bg', '#17191c');
            root.style.setProperty('--theme-text', '#e2e4e9');
            root.style.setProperty('--theme-link', 'hsl(157, 100%, 66%)');
            root.style.setProperty('--theme-border', '#374151');
            root.style.setProperty('--theme-accent', 'hsl(149, 49%, 63%)');
            root.style.setProperty('--theme-accent-hover', 'hsl(157, 80%, 76%)');
            root.style.setProperty('--theme-panel-bg', 'rgba(23, 25, 28, 0.95)');
        } else if (currentTheme === 'sepia') {
            root.style.setProperty('--theme-bg', '#FBF0D9');
            root.style.setProperty('--theme-text', '#5B4636');
            root.style.setProperty('--theme-link', '#c2410c');
            root.style.setProperty('--theme-border', '#d8c0a0');
            root.style.setProperty('--theme-accent', 'hsl(333, 100%, 35%)');
            root.style.setProperty('--theme-accent-hover', 'hsl(333, 100%, 45%)');
            root.style.setProperty('--theme-panel-bg', 'rgba(251, 240, 217, 0.95)');
        } else { // Light theme
            root.style.setProperty('--theme-bg', '#ffffff');
            root.style.setProperty('--theme-text', '#111827');
            root.style.setProperty('--theme-link', 'hsl(333, 100%, 35%)');
            root.style.setProperty('--theme-border', '#e5e7eb');
            root.style.setProperty('--theme-accent', 'hsl(333, 100%, 35%)');
            root.style.setProperty('--theme-accent-hover', 'hsl(333, 100%, 45%)');
            root.style.setProperty('--theme-panel-bg', 'rgba(255, 255, 255, 0.95)');
        }

        root.style.setProperty('--font-size', `${currentFontSize}px`);
        root.style.setProperty('--font-family', currentFontFamily === 'serif' ? 'Georgia, serif' : 'Helvetica, Arial, sans-serif');
    });

    // === INFINITE SCROLL LOGIC ===

    async function loadNextChapter(url) {
        if (isFetching || !url) return;
        isFetching = true;

        const chaptersContainer = document.getElementById('chapters-container');
        const loader = document.getElementById('infinite-scroll-loader');
        if (loader) loader.hidden = false;

        try {
            const response = await fetch(url);
            const doc = await response.text().then(html => new DOMParser().parseFromString(html, 'text/html'));
            const newProse = doc.querySelector('.chapter-prose');

            if (newProse && chaptersContainer) {
                if (newProse.querySelector('.next-chapter-link')) {
                    newProse.querySelector('.next-chapter-link').style.display = 'none';
                }
                const newWrapper = document.createElement('div');
                newWrapper.className = 'chapter-wrapper';
                newWrapper.appendChild(newProse);
                chaptersContainer.appendChild(newWrapper);

                history.pushState({}, '', url);
                document.title = doc.title;
                const newTitle = newProse.querySelector('.chapter-header h1').textContent;
                localStorage.setItem('lastReadUrl', url);
                localStorage.setItem('lastReadTitle', newTitle);

                const newFooter = newProse.querySelector('.chapter-footer');
                if (newFooter && newFooter.dataset.nextUrl) {
                    intersectionObserver.observe(newFooter);
                } else {
                    intersectionObserver.disconnect();
                }
            }
        } catch (error) {
            console.error("Failed to load next chapter:", error);
        } finally {
            isFetching = false;
            if(loader) loader.hidden = true;
        }
    }

    // Effect for managing the infinite scroll observer
    $effect(() => {
        const isActive = currentInfiniteScroll === 'on';
        const chaptersContainer = document.getElementById('chapters-container');
        
        if (!chaptersContainer) return;

        document.querySelectorAll('.next-chapter-link').forEach(link => {
            link.style.display = isActive ? 'none' : 'inline-block';
        });

        if (isActive) {
            if (intersectionObserver) intersectionObserver.disconnect();
            intersectionObserver = new IntersectionObserver(entries => {
                if (entries[0]?.isIntersecting) {
                    intersectionObserver.unobserve(entries[0].target);
                    loadNextChapter(entries[0].target.dataset.nextUrl);
                }
            }, { rootMargin: '400px' });

            const lastFooter = chaptersContainer.querySelector('.chapter-footer:last-of-type');
            if (lastFooter?.dataset.nextUrl) {
                intersectionObserver.observe(lastFooter);
            }
        } else {
            if (intersectionObserver) intersectionObserver.disconnect();
        }
    });

    </script>

<!-- The UI for the Settings Panel, now with standard CSS -->
{#if isPanelOpen}
    <div 
        class="settings-panel ui-panel"
        role="dialog"
        aria-label="Reading settings panel"
        aria-modal="true"
    >
        <div class="settings-content">
            <!-- Panel Header -->
            <div class="panel-header">
                <h3 class="panel-title">Reading Settings</h3>
                <button 
                    class="close-button"
                    onclick={() => isPanelOpen = false}
                    aria-label="Close settings panel"
                >
                    <svg class="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>

            <!-- Theme Section -->
            <div class="settings-section">
                <div class="section-label">Theme</div>
                <div class="theme-buttons" role="group" aria-label="Theme selection">
                    <button
                        class="button-base theme-button"
                        class:active={currentTheme === 'light'}
                        onclick={() => changeTheme('light')}
                        aria-pressed={currentTheme === 'light'}
                    >Light</button>
                    <button 
                        class="button-base theme-button"
                        class:active={currentTheme === 'sepia'}
                        onclick={() => changeTheme('sepia')}
                        aria-pressed={currentTheme === 'sepia'}
                    >Sepia</button>
                    <button 
                        class="button-base theme-button"
                        class:active={currentTheme === 'dark'}
                        onclick={() => changeTheme('dark')}
                        aria-pressed={currentTheme === 'dark'}
                    >Dark</button>
                </div>
            </div>

            <!-- Font Size Section -->
            <div class="settings-section">
                <div class="section-label">Font Size</div>
                <div class="font-size-controls" role="group" aria-label="Font size controls">
                    <button 
                        class="button-base font-size-button"
                        onclick={() => changeFontSize(-1)}
                        aria-label="Decrease font size"
                    >A−</button>
                    <div class="font-size-display">
                        {currentFontSize}px
                    </div>
                    <button 
                        class="button-base font-size-button"
                        onclick={() => changeFontSize(1)}
                        aria-label="Increase font size"
                    >A+</button>
                </div>
            </div>

            <!-- Font Style Section -->
            <div class="settings-section">
                <div class="section-label">Font Style</div>
                <div class="font-style-buttons" role="group" aria-label="Font style selection">
                    <button
                        class="button-base font-style-button"
                        class:active={currentFontFamily === 'serif'}
                        onclick={() => changeFontFamily('serif')}
                        aria-pressed={currentFontFamily === 'serif'}
                        style="font-family: Georgia, serif;"
                    >Serif</button>
                    <button
                        class="button-base font-style-button"
                        class:active={currentFontFamily === 'sans-serif'}
                        onclick={() => changeFontFamily('sans-serif')}
                        aria-pressed={currentFontFamily === 'sans-serif'}
                        style="font-family: system-ui, sans-serif;"
                    >Sans-serif</button>
                </div>
            </div>
            
            <!-- Reading Mode Section -->
            <div class="settings-section">
                <div class="section-label">Reading Mode</div>
                <div class="reading-mode-buttons" role="group" aria-label="Reading mode selection">
                    <button
                        class="button-base reading-mode-button"
                        class:active={currentInfiniteScroll === 'off'}
                        onclick={() => changeInfiniteScroll('off')}
                        aria-pressed={currentInfiniteScroll === 'off'}
                    >
                        <span class="mode-title">Paginated</span>
                        <span class="mode-subtitle">Chapter by chapter</span>
                    </button>
                    <button
                        class="button-base reading-mode-button"
                        class:active={currentInfiniteScroll === 'on'}
                        onclick={() => changeInfiniteScroll('on')}
                        aria-pressed={currentInfiniteScroll === 'on'}
                    >
                        <span class="mode-title">Infinite</span>
                        <span class="mode-subtitle">Continuous scroll</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- Chapter List Panel -->
{#if isChapterListOpen}
    <div 
        class="chapter-list-panel ui-panel"
        role="dialog"
        aria-label="Chapter list panel"
        aria-modal="true"
    >
        {#if currentBook}
            <div class="chapter-list-header">
                <div class="chapter-list-title-row">
                    <h3 class="chapter-list-title">{currentBook.title}</h3>
                    <button 
                        class="close-button"
                        onclick={() => isChapterListOpen = false}
                        aria-label="Close chapter list"
                    >
                        <svg class="close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <p class="chapter-list-subtitle">Choose a chapter to read</p>
            </div>
            
            <div class="chapter-list" role="list" aria-label="Chapter list">
                {#if chapters.length > 0}
                    {#each chapters as chapter}
                        <li class="chapter-item" role="listitem">
                            <a 
                                href={chapter.url}
                                class="button-base chapter-link {currentChapter && currentChapter.chapterNumber === chapter.chapterNumber ? 'chapter-link-current' : ''}"
                                aria-current={currentChapter && currentChapter.chapterNumber === chapter.chapterNumber ? 'page' : undefined}
                            >
                                <div class="chapter-content">
                                    <div class="chapter-main">
                                        <div class="chapter-badges">
                                            <span class="chapter-number">
                                                Ch. {chapter.chapterNumber}
                                            </span>
                                            {#if currentChapter && currentChapter.chapterNumber === chapter.chapterNumber}
                                                <span class="current-reading-badge">
                                                    Currently Reading
                                                </span>
                                            {/if}
                                        </div>
                                        <div class="chapter-title">
                                            {chapter.title}
                                        </div>
                                        <div class="chapter-meta">
                                            <span class="chapter-stat">
                                                <svg class="stat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                                </svg>
                                                {chapter.wordCount} words
                                            </span>
                                            <span class="chapter-stat">
                                                <svg class="stat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                                ~{Math.ceil(chapter.wordCount / 250)} min read
                                            </span>
                                        </div>
                                    </div>
                                    <div class="chapter-arrow">
                                        <svg class="arrow-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                        </svg>
                                    </div>
                                </div>
                            </a>
                        </li>
                    {/each}
                {:else}
                    <div class="no-chapters">
                        <svg class="no-chapters-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <p class="no-chapters-text">No chapters available</p>
                    </div>
                {/if}
            </div>
            
            <div class="chapter-list-footer">
                <a 
                    href={currentBook.url}
                    class="button-base back-to-book-link"
                >
                    <svg class="back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Back to {currentBook.title}
                </a>
            </div>
        {:else}
            <div class="no-chapters">
                <svg class="no-chapters-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 13.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
                <p class="no-chapters-text">Chapter list not available</p>
            </div>
        {/if}
    </div>
{/if}

<!-- Custom styles for the settings panel -->
<style>
    /* Panel animations */
    /* -- Animations -- */
@keyframes slide-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
@keyframes flicker {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.95; }
}

/* -- Base UI Panel -- */
/* This new class combines all shared styles for settings-panel and chapter-list-panel */
.ui-panel {
    position: fixed;
    bottom: 80px;
    z-index: 1011;
    width: 320px;
    padding: 0;
    border-radius: 4px;
    border: 3px solid var(--theme-border);
    box-shadow: 
        0 0 0 3px var(--theme-accent), 0 0 0 6px var(--theme-bg),
        0 0 0 9px var(--theme-border), 0 12px 24px -6px rgba(0,0,0,0.4),
        inset 0 1px 0 rgba(255,255,255,0.1);
    background: linear-gradient(135deg, var(--theme-panel-bg) 0%, var(--theme-bg) 100%);
    color: var(--theme-text);
    font-family: 'Courier New', monospace; /* Font family is inherited by all children */
    animation: slide-up 200ms ease-out;
    transform: translateZ(0);
    overflow: hidden;
}
.ui-panel::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 4px;
    background: linear-gradient(90deg, 
        var(--theme-accent) 0%, var(--theme-accent-hover) 25%, 
        var(--theme-accent) 50%, var(--theme-accent-hover) 75%, 
        var(--theme-accent) 100%);
    animation: flicker 2s infinite;
}
.ui-panel::after {
    content: '';
    position: absolute;
    top: 8px;
    left: 12px;
    right: 12px;
    height: 1px;
    background: var(--theme-border);
    opacity: 0.3;
}
.ui-panel:focus-within {
    outline: 3px solid var(--theme-accent);
    outline-offset: 3px;
}

/* -- Settings Panel Specifics -- */
.settings-panel {
    right: 20px;
}
.settings-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 2rem 1.5rem 1.5rem;
}
.panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2px solid var(--theme-border);
    padding-bottom: 0.75rem;
    position: relative;
}
.panel-header::before, .panel-title::after {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    color: var(--theme-accent);
}
.panel-header::before {
    content: '■';
    left: -0.5rem;
    font-size: 0.75rem;
    animation: flicker 3s infinite;
}
.panel-title {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin: 0;
    position: relative;
}
.panel-title::after {
    content: '';
    right: -1rem;
    width: 6px;
    height: 6px;
    background: var(--theme-accent);
    clip-path: polygon(0 0, 100% 50%, 0 100%);
}

/* -- Chapter List Panel Specifics -- */
.chapter-list-panel {
    left: 20px;
    width: 420px;
    max-height: 70vh;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--theme-accent) var(--theme-border);
}
.chapter-list-panel::-webkit-scrollbar { width: 12px; }
.chapter-list-panel::-webkit-scrollbar-track { background: var(--theme-border); }
.chapter-list-panel::-webkit-scrollbar-thumb {
    background: var(--theme-accent);
    border: 2px solid var(--theme-border);
    box-shadow: inset 0 0 0 1px var(--theme-bg);
}
.chapter-list-panel::-webkit-scrollbar-thumb:hover { background: var(--theme-accent-hover); }
.chapter-list-panel::-webkit-scrollbar-corner { background: var(--theme-border); }

.chapter-list-header {
    padding: 2rem 1.5rem 1rem;
    border-bottom: 2px solid var(--theme-border);
    position: relative;
}
.chapter-list-header::before {
    content: '◆';
    position: absolute;
    left: 1rem;
    top: 1.75rem;
    color: var(--theme-accent);
    font-size: 0.875rem;
    animation: flicker 4s infinite;
}
.chapter-list-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
}
.chapter-list-title, .chapter-list-subtitle, .no-chapters-text {
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin: 0;
}
.chapter-list-title { font-size: 1rem; }
.chapter-list-subtitle { font-size: 0.75rem; opacity: 0.7; }
.chapter-list-subtitle::before { content: '> '; color: var(--theme-accent); }

.chapter-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    list-style: none;
    padding: 0 1.5rem 1.5rem;
    margin: 0;
}
.chapter-item { list-style: none; padding: 0; margin: 0; }
.chapter-link {
    display: block !important; /* Overrides flex from .button-base */
    text-decoration: none;
    color: inherit;
    margin-bottom: 0.25rem;
    text-align: left !important; /* Overrides center from .button-base */
    text-transform: none !important; /* Overrides uppercase from .button-base */
    flex-direction: row !important; /* Overrides column from .button-base */
    padding: 0.75rem 1rem; /* Matches .button-base padding */
    min-height: auto; /* Overrides min-height from .button-base */
}
.chapter-link::before {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 4px;
    height: 100%;
    background: var(--theme-border);
    transition: all 0.2s ease;
}
.chapter-link:hover::before { background: var(--theme-accent); width: 8px; }
.chapter-link.chapter-link-current {
    background: var(--theme-accent);
    color: white;
    font-weight: 700;
    border-color: var(--theme-accent);
}
.chapter-link.chapter-link-current::before { background: white; width: 8px; }
.chapter-link.chapter-link-current:hover { background: var(--theme-accent-hover); }

.chapter-content { display: flex; align-items: center; justify-content: space-between; }
.chapter-main { flex: 1; min-width: 0; }
.chapter-badges { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
.chapter-number {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.25rem 0.5rem;
    background: var(--theme-border);
    border: 1px solid var(--theme-text);
    box-shadow: 2px 2px 0 var(--theme-text);
    letter-spacing: 0.05em;
}
.chapter-link-current .chapter-number {
    background: rgba(255, 255, 255, 0.9);
    color: var(--theme-accent);
    border-color: white;
    box-shadow: 2px 2px 0 rgba(255, 255, 255, 0.5);
}
.current-reading-badge {
    font-size: 0.625rem;
    padding: 0.25rem 0.5rem;
    background: rgba(255,255,255,0.9);
    color: var(--theme-accent);
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    border: 1px solid white;
    animation: flicker 3s infinite;
}
.chapter-title {
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-right: 0.5rem;
    letter-spacing: 0.02em;
}
.chapter-meta { display: flex; align-items: center; gap: 0.75rem; font-size: 0.75rem; opacity: 0.7; letter-spacing: 0.05em; }
.chapter-stat { display: flex; align-items: center; gap: 0.25rem; }
.chapter-arrow { display: flex; align-items: center; opacity: 0.5; }
.stat-icon { width: 0.75rem; height: 0.75rem; stroke-width: 2.5; }
.arrow-icon, .back-icon { width: 1rem; height: 1rem; stroke-width: 3; }

.chapter-list-footer { padding: 1rem 1.5rem; border-top: 2px solid var(--theme-border); background: var(--theme-bg); }
.back-to-book-link {
    display: flex !important; /* Keep flex for icon + text layout */
    flex-direction: row !important; /* Override column from .button-base */
    align-items: center !important;
    gap: 0.5rem;
    text-decoration: none;
    text-transform: none !important; /* Override uppercase from .button-base */
    width: 100%;
    justify-content: center;
}
.no-chapters { text-align: center; padding: 2rem; opacity: 0.7; }
.no-chapters-icon { width: 3rem; height: 3rem; margin: 0 auto 0.75rem; opacity: 0.4; stroke-width: 2; }


/* -- Abstracted Button Base -- */
/* Apply this class to all button-like elements in HTML for consistent styling */
.button-base {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1rem;
    min-height: 2.5rem;
    border-radius: 2px;
    border: 2px solid var(--theme-border);
    background: var(--theme-bg);
    color: var(--theme-text);
    font-size: 0.875rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.1s ease;
    box-shadow: 2px 2px 0 var(--theme-border);
}
.button-base:hover {
    background: var(--theme-accent);
    color: white;
    border-color: var(--theme-accent);
    transform: translate(2px, -2px);
    box-shadow: -4px 4px 0 var(--theme-text);
    text-decoration: none;
}

.button-base:hover .chapter-number {
    color: var(--theme-accent);
}
.button-base:focus {
    outline: none;
    box-shadow: 0 0 0 3px var(--theme-accent);
}
.button-base:active {
    transform: translate(1px, -1px);
    box-shadow: -2px 2px 0 var(--theme-text);
}
/* Sweep animation for buttons */
.button-base::before, .close-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, var(--theme-accent), transparent);
    transition: left 0.3s ease;
}
.button-base:hover::before, .close-button:hover::before { left: 100%; }

/* Active state for toggle buttons */
.button-base.active {
    background: var(--theme-accent);
    color: white;
    border-color: var(--theme-accent);
    transform: translate(2px, -2px);
    box-shadow: -4px 4px 0 var(--theme-text);
}
.button-base.active:hover {
    background: var(--theme-accent-hover);
    border-color: var(--theme-accent-hover);
}
.button-base.active::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: white;
    opacity: 0.8;
}

/* -- Component-Specific & Overrides -- */
.close-button {
    padding: 0.5rem;
    border-radius: 2px;
    background: var(--theme-border);
    border: 2px solid var(--theme-text);
    cursor: pointer;
    transition: all 0.1s ease;
    position: relative;
    overflow: hidden;
}
.close-button:hover {
    background: var(--theme-accent);
    color: white;
    transform: translate(1px, 1px);
    box-shadow: -2px -2px 0 var(--theme-border);
}
.close-button:active {
    transform: translate(2px, 2px);
    box-shadow: -1px -1px 0 var(--theme-border);
}
.close-icon { width: 1.125rem; height: 1.125rem; stroke-width: 3; }

.settings-section {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.settings-section::before {
    content: '';
    position: absolute;
    left: -1.5rem; right: -1.5rem;
    top: -0.5rem;
    height: 1px;
    background: linear-gradient(90deg, transparent 0%, var(--theme-border) 20%, var(--theme-border) 80%, transparent 100%);
}
.section-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 700;
    opacity: 0.8;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 0.5rem;
}
.section-label::before {
    content: '▶';
    margin-right: 0.5rem;
    color: var(--theme-accent);
    font-size: 0.6rem;
}
.theme-buttons, .font-style-buttons, .reading-mode-buttons, .font-size-controls {
    display: flex;
    gap: 0.5rem;
}
.theme-button, .font-style-button, .reading-mode-button { flex: 1; }
.reading-mode-button { padding: 1rem 0.75rem; }
.theme-button::after {
    content: '';
    position: absolute;
    top: 50%;
    right: 0.5rem;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-bottom: 6px solid currentColor;
    opacity: 0;
    transition: opacity 0.2s ease;
}
.theme-button.active::after { opacity: 1; }
.font-style-button.active::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: var(--theme-accent);
    z-index: 1;
}
.reading-mode-button::before {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 4px;
    height: 100%;
    background: var(--theme-border);
    transition: all 0.2s ease;
}
.reading-mode-button.active::before { background: var(--theme-accent); width: 8px; }
.mode-title { font-size: 0.875rem; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
.mode-subtitle { font-size: 0.75rem; opacity: 0.7; letter-spacing: 0.05em; }

.font-size-controls { justify-content: center; align-items: center; }
.font-size-button { padding: 0.75rem 1.25rem; font-size: 1rem; /* Inherits .button-base */}
.font-size-button::before {
    /* This ::before is for a different effect than the base button, so we override it */
    content: '';
    position: absolute;
    top: 2px; left: 2px; right: 2px; bottom: 2px;
    background: var(--theme-bg);
    z-index: -1;
    transition: all 0.1s ease;
}
.font-size-button:hover::before { background: var(--theme-accent); }
.font-size-display {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 70px;
    padding: 0.75rem 1.25rem;
    border-radius: 2px;
    background: var(--theme-bg);
    border: 2px solid var(--theme-border);
    font-size: 0.875rem;
    font-weight: 700;
    position: relative;
    box-shadow: inset 2px 2px 0 rgba(0,0,0,0.1);
}
.font-size-display::before {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 100%;
    height: 2px;
    background: var(--theme-accent);
    opacity: 0.6;
}

/* -- Responsive & Accessibility -- */
@media (max-width: 768px) {
    .ui-panel { /* Target base class */
        left: 10px;
        right: 10px;
        width: auto;
    }
    .chapter-list-panel { max-height: 60vh; }
    .button-base { padding: 0.875rem 0.75rem; font-size: 0.75rem; }
    .font-size-display { min-width: 60px; }
}
@media (max-width: 480px) {
    .ui-panel {
        bottom: 70px;
        left: 5px;
        right: 5px;
    }
    .chapter-list-panel { max-height: 50vh; }
}
@media (prefers-contrast: high) {
    .button-base, .chapter-link { border-width: 3px; }
    .button-base:focus { box-shadow: 0 0 0 4px var(--theme-accent); }
}
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
    }
}
</style>