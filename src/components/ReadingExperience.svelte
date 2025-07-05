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
            root.style.setProperty('--theme-bg', '#121212');
            root.style.setProperty('--theme-text', '#E0E0E0');
            root.style.setProperty('--theme-link', '#60a5fa');
            root.style.setProperty('--theme-border', '#374151');
        } else if (currentTheme === 'sepia') {
            root.style.setProperty('--theme-bg', '#FBF0D9');
            root.style.setProperty('--theme-text', '#5B4636');
            root.style.setProperty('--theme-link', '#c2410c');
            root.style.setProperty('--theme-border', '#d8c0a0');
        } else { // Light theme
            root.style.setProperty('--theme-bg', '#ffffff');
            root.style.setProperty('--theme-text', '#111827');
            root.style.setProperty('--theme-link', '#3b82f6');
            root.style.setProperty('--theme-border', '#e5e7eb');
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

<!-- The UI for the Settings Panel, now with Tailwind classes -->
{#if isPanelOpen}
    <div 
        class="settings-panel fixed bottom-[70px] right-4 z-[1011] p-4 rounded-lg shadow-lg 
               min-w-[200px] border backdrop-blur-lg
               bg-[--theme-bg] border-[--theme-border] text-[--theme-text]
               max-md:left-4 max-md:right-4 max-md:min-w-0"
    >
        <div class="space-y-4">
            <!-- Theme Section -->
            <div>
                <div class="block mb-2 text-sm font-bold opacity-80">Theme</div>
                <div class="flex flex-wrap gap-2 max-md:justify-center">
                    <button
                        class="button-base max-md:flex-1"
                        class:active={currentTheme === 'light'}
                        onclick={() => changeTheme('light')}
                    >Light</button>
                    <button 
                        class="button-base max-md:flex-1"
                        class:active={currentTheme === 'sepia'}
                        onclick={() => changeTheme('sepia')}
                    >Sepia</button>
                    <button 
                        class="button-base max-md:flex-1"
                        class:active={currentTheme === 'dark'}
                        onclick={() => changeTheme('dark')}
                    >Dark</button>
                </div>
            </div>

            <!-- Font Size Section -->
            <div>
                <div class="block mb-2 text-sm font-bold opacity-80">Font Size</div>
                <div class="flex flex-wrap gap-2 max-md:justify-center">
                    <button class="button-base max-md:flex-1" onclick={() => changeFontSize(-1)}>A-</button>
                    <button class="button-base max-md:flex-1" onclick={() => changeFontSize(1)}>A+</button>
                </div>
            </div>

            <!-- Font Style Section -->
            <div>
                <div class="block mb-2 text-sm font-bold opacity-80">Font Style</div>
                <div class="flex flex-wrap gap-2 max-md:justify-center">
                    <button
                        class="button-base max-md:flex-1"
                        class:active={currentFontFamily === 'serif'}
                        onclick={() => changeFontFamily('serif')}
                    >Serif</button>
                    <button
                        class="button-base max-md:flex-1"
                        class:active={currentFontFamily === 'sans-serif'}
                        onclick={() => changeFontFamily('sans-serif')}
                    >Sans-serif</button>
                </div>
            </div>
            
            <!-- Reading Mode Section -->
            <div>
                <div class="block mb-2 text-sm font-bold opacity-80">Reading Mode</div>
                <div class="flex flex-wrap gap-2 max-md:justify-center">
                    <button
                        class="button-base max-md:flex-1"
                        class:active={currentInfiniteScroll === 'off'}
                        onclick={() => changeInfiniteScroll('off')}
                    >Paginated</button>
                    <button
                        class="button-base max-md:flex-1"
                        class:active={currentInfiniteScroll === 'on'}
                        onclick={() => changeInfiniteScroll('on')}
                    >Infinite</button>
                </div>
            </div>
        </div>
    </div>
{/if}

<!-- Chapter List Panel -->
{#if isChapterListOpen}
    <div 
        class="chapter-list-panel fixed bottom-[70px] left-4 z-[1011] p-4 rounded-lg shadow-lg 
               min-w-[300px] max-w-[400px] border backdrop-blur-lg
               bg-[--theme-bg] border-[--theme-border] text-[--theme-text]
               max-md:left-4 max-md:right-4 max-md:min-w-0 max-md:max-w-none
               max-h-[70vh] overflow-y-auto"
    >
        {#if currentBook}
            <div class="mb-3 pb-3 border-b border-[--theme-border]">
                <h3 class="text-lg font-bold opacity-90">{currentBook.title}</h3>
                <p class="text-sm opacity-70">Choose a chapter</p>
            </div>
            
            <div class="space-y-2">
                {#if chapters.length > 0}
                    {#each chapters as chapter}
                        <a 
                            href={chapter.url}
                            class="chapter-link block p-3 rounded-lg transition-all duration-200
                                   hover:bg-[--theme-border] hover:shadow-sm
                                   {currentChapter && currentChapter.chapterNumber === chapter.chapterNumber ? 'bg-[--theme-link] text-[--theme-bg] font-semibold' : ''}"
                        >
                            <div class="flex items-center justify-between">
                                <div class="flex-1">
                                    <div class="text-sm font-medium">
                                        Chapter {chapter.chapterNumber}
                                    </div>
                                    <div class="text-sm opacity-80 mt-1">
                                        {chapter.title}
                                    </div>
                                </div>
                                <div class="text-xs opacity-60 ml-2">
                                    {chapter.wordCount} words
                                </div>
                            </div>
                        </a>
                    {/each}
                {:else}
                    <div class="text-center py-4 opacity-70">
                        No chapters available
                    </div>
                {/if}
            </div>
            
            <div class="mt-4 pt-3 border-t border-[--theme-border]">
                <a 
                    href={currentBook.url}
                    class="block text-center p-2 rounded-lg text-sm opacity-70 hover:opacity-100 hover:bg-[--theme-border] transition-all"
                >
                    ← Back to {currentBook.title}
                </a>
            </div>
        {:else}
            <div class="text-center py-4 opacity-70">
                Chapter list not available
            </div>
        {/if}
    </div>
{/if}

<!-- Custom styles for the settings panel -->
<style>
    .button-base {
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        background-color: transparent;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 1px solid var(--theme-border);
        color: var(--theme-text);
    }

    .button-base:hover {
        background-color: var(--theme-border);
        opacity: 0.8;
    }
    
    .button-base:focus {
        outline: none;
        box-shadow: 0 0 0 2px var(--theme-bg), 0 0 0 4px var(--theme-link);
    }

    /* Active state styling */
    .button-base.active {
        font-weight: bold;
        background-color: var(--theme-link);
        color: var(--theme-bg);
        border-color: var(--theme-link);
    }

    /* Chapter list styles */
    .chapter-list-panel {
        scrollbar-width: thin;
        scrollbar-color: var(--theme-border) transparent;
    }

    .chapter-list-panel::-webkit-scrollbar {
        width: 6px;
    }

    .chapter-list-panel::-webkit-scrollbar-track {
        background: transparent;
    }

    .chapter-list-panel::-webkit-scrollbar-thumb {
        background-color: var(--theme-border);
        border-radius: 3px;
    }

    .chapter-link {
        text-decoration: none;
        color: inherit;
    }

    .chapter-link:hover {
        text-decoration: none;
    }
</style>