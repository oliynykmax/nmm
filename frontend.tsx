import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

// ============================================================================
// Types
// ============================================================================

type Language = "fi" | "en";
type Theme = "light" | "dark";

interface Link {
  href: string;
  available: boolean;
}

interface Exercise {
  number: number;
  exercises: { fi: Link; en: Link };
  solutions: { fi: Link; en: Link };
}

interface CourseData {
  lectureNotes: { fi: Link; en: Link };
  moodle: { fi: Link; en: Link };
  exercises: Exercise[];
  lastUpdated: string | null;
  fetchedAt: Date;
}

// ============================================================================
// Rickroll Detection & URL Utilities
// ============================================================================

const RICKROLL_PATTERNS = [
  "youtube.com/watch?v=dQw4w9WgXcQ",
  "youtu.be/dQw4w9WgXcQ",
  "dQw4w9WgXcQ",
];

function isRickroll(url: string): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return RICKROLL_PATTERNS.some((pattern) => lower.includes(pattern.toLowerCase()));
}

function resolveUrl(href: string | null, baseUrl: string): string {
  if (!href) return "";
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  }
  // Relative URL - resolve against base
  const base = new URL(baseUrl);
  return new URL(href, base).href;
}

// ============================================================================
// HTML Parser
// ============================================================================

const SOURCE_URL = "https://tskarvone.github.io/courses/2026-numer";

async function fetchAndParseCourseData(): Promise<CourseData> {
  const response = await fetch(SOURCE_URL, { cache: "no-cache" });
  const html = await response.text();
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  
  // Extract lecture notes
  const allLinks = Array.from(doc.querySelectorAll("a")) as HTMLAnchorElement[];
  
  const findLink = (pattern: string): Link => {
    const anchor = allLinks.find((a: HTMLAnchorElement) => a.getAttribute("href")?.includes(pattern));
    const href = anchor?.getAttribute("href") || "";
    const resolved = resolveUrl(href, SOURCE_URL);
    return {
      href: resolved,
      available: !!resolved && !isRickroll(resolved),
    };
  };
  
  // Lecture notes
  const lectureNotes = {
    fi: findLink("pruju_fi.pdf"),
    en: findLink("pruju_en.pdf"),
  };
  
  // Moodle links
  const moodleFi = allLinks.find((a: HTMLAnchorElement) => 
    a.textContent?.includes("Suomenkielinen Moodle") || 
    a.getAttribute("href")?.includes("25579")
  );
  const moodleEn = allLinks.find((a: HTMLAnchorElement) => 
    a.textContent?.includes("English Moodle") || 
    a.getAttribute("href")?.includes("25580")
  );
  
  const moodle = {
    fi: {
      href: moodleFi?.getAttribute("href") || "",
      available: !!moodleFi?.getAttribute("href"),
    },
    en: {
      href: moodleEn?.getAttribute("href") || "",
      available: !!moodleEn?.getAttribute("href"),
    },
  };
  
  // Parse exercises from the ordered list
  const exerciseList = doc.querySelector("ol");
  const exerciseItems = exerciseList ? Array.from(exerciseList.querySelectorAll("li")) as HTMLLIElement[] : [];
  
  const exercises: Exercise[] = exerciseItems.map((li: HTMLLIElement, index: number) => {
    const links = Array.from(li.querySelectorAll("a")) as HTMLAnchorElement[];
    
    const getExerciseLink = (lang: "fi" | "en"): Link => {
      const pattern = lang === "fi" ? `ex${index + 1}_fi.pdf` : `ex${index + 1}_en.pdf`;
      const anchor = links.find((a: HTMLAnchorElement) => a.getAttribute("href")?.includes(pattern));
      const href = anchor?.getAttribute("href") || "";
      const resolved = resolveUrl(href, SOURCE_URL);
      return {
        href: resolved,
        available: !!resolved && !isRickroll(resolved),
      };
    };
    
    const getSolutionLink = (lang: "fi" | "en"): Link => {
      const pattern = lang === "fi" ? `ex${index + 1}_fi_sol.pdf` : `ex${index + 1}_en_sol.pdf`;
      const anchor = links.find((a: HTMLAnchorElement) => a.getAttribute("href")?.includes(pattern));
      const href = anchor?.getAttribute("href") || "";
      const resolved = resolveUrl(href, SOURCE_URL);
      
      // Check if this is a rickroll (solution links often are)
      if (!resolved || isRickroll(resolved)) {
        // Also check if there's any "sol" link that's a rickroll
        const solAnchor = links.find((a: HTMLAnchorElement) => {
          const h = a.getAttribute("href") || "";
          const text = a.textContent?.toLowerCase() || "";
          return (text.includes("ratkaisu") || text.includes("solution")) && isRickroll(h);
        });
        if (solAnchor) {
          return { href: "", available: false };
        }
      }
      
      return {
        href: resolved,
        available: !!resolved && !isRickroll(resolved),
      };
    };
    
    return {
      number: index + 1,
      exercises: { fi: getExerciseLink("fi"), en: getExerciseLink("en") },
      solutions: { fi: getSolutionLink("fi"), en: getSolutionLink("en") },
    };
  });
  
  // Extract last updated from footer script (we'll use current time as fallback)
  let lastUpdated: string | null = null;
  const footer = doc.querySelector("footer");
  if (footer) {
    // The original uses JS to render date, so we can't extract it statically
    // We'll show our fetch time instead
  }
  
  return {
    lectureNotes,
    moodle,
    exercises,
    lastUpdated,
    fetchedAt: new Date(),
  };
}

// ============================================================================
// Components
// ============================================================================

function LanguageToggle({ 
  language, 
  onToggle 
}: { 
  language: Language; 
  onToggle: () => void;
}) {
  return (
    <button className="language-toggle" onClick={onToggle} aria-label="Toggle language">
      <span className={language === "fi" ? "active" : ""}>FI</span>
      <span className="separator">/</span>
      <span className={language === "en" ? "active" : ""}>EN</span>
    </button>
  );
}

function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: Theme;
  onToggle: () => void;
}) {
  return (
    <button className="theme-toggle" onClick={onToggle} aria-label="Toggle theme">
      {theme === "light" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )}
    </button>
  );
}

function RefreshButton({ 
  onRefresh, 
  loading 
}: { 
  onRefresh: () => void; 
  loading: boolean;
}) {
  return (
    <button 
      className="refresh-button" 
      onClick={onRefresh} 
      disabled={loading}
      aria-label="Refresh content"
    >
      <svg 
        className={loading ? "spinning" : ""} 
        width="18" 
        height="18" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
        <path d="M16 21h5v-5" />
      </svg>
      <span className="refresh-text">{loading ? "Refreshing..." : "Refresh"}</span>
    </button>
  );
}

function LinkButton({ 
  link, 
  children, 
  variant = "primary" 
}: { 
  link: Link; 
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  if (!link.available) {
    return (
      <span className={`link-button ${variant} unavailable`}>
        {children}
        <span className="coming-soon">Coming soon</span>
      </span>
    );
  }
  
  return (
    <a 
      href={link.href} 
      target="_blank" 
      rel="noopener noreferrer" 
      className={`link-button ${variant}`}
    >
      {children}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    </a>
  );
}

function ExerciseCard({ 
  exercise, 
  language 
}: { 
  exercise: Exercise; 
  language: Language;
}) {
  const ex = exercise.exercises[language];
  const sol = exercise.solutions[language];
  const hasAnyContent = ex.available || sol.available;
  
  const labels = {
    fi: { exercises: "Harjoitukset", solutions: "Ratkaisut" },
    en: { exercises: "Exercises", solutions: "Solutions" },
  };
  
  return (
    <div className={`exercise-card ${!hasAnyContent ? "empty" : ""}`}>
      <div className="exercise-primary">
        <div className="exercise-number">
          <span>{exercise.number}</span>
        </div>
        <LinkButton link={ex} variant="primary">
          {labels[language].exercises}
        </LinkButton>
      </div>
      <LinkButton link={sol} variant="secondary">
        {labels[language].solutions}
      </LinkButton>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="loading-state">
      <div className="loading-spinner"></div>
      <p>Fetching course materials...</p>
    </div>
  );
}

function ErrorState({ 
  error, 
  onRetry 
}: { 
  error: string; 
  onRetry: () => void;
}) {
  return (
    <div className="error-state">
      <div className="error-icon">!</div>
      <h2>Failed to load course materials</h2>
      <p>{error}</p>
      <button className="retry-button" onClick={onRetry}>
        Try Again
      </button>
    </div>
  );
}

// ============================================================================
// Main App
// ============================================================================

function App() {
  const [language, setLanguage] = useState<Language>("en");
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first, then system preference
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme") as Theme | null;
      if (saved) return saved;
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
    }
    return "light";
  });
  const [data, setData] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);
  
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const courseData = await fetchAndParseCourseData();
      setData(courseData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "en" ? "fi" : "en"));
  };
  
  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };
  
  const handleRefresh = () => {
    fetchData(true);
  };
  
  const labels = {
    fi: {
      title: "Numeeriset menetelmat",
      subtitle: "BM20A1502 | Kevat 2026",
      lectureNotes: "Luentomoniste",
      lectureNotesShort: "Moniste",
      moodle: "Moodle-kurssi",
      moodleShort: "Moodle",
      exercises: "Laskuharjoitukset",
      fetchedAt: "Haettu",
      sourceLink: "Alkuperainen sivu",
    },
    en: {
      title: "Numerical Methods",
      subtitle: "BM20A1502 | Spring 2026",
      lectureNotes: "Lecture Notes",
      lectureNotesShort: "Notes",
      moodle: "Moodle Course",
      moodleShort: "Moodle",
      exercises: "Exercises",
      fetchedAt: "Fetched",
      sourceLink: "Original page",
    },
  };
  
  const l = labels[language];
  
  if (loading && !data) {
    return <LoadingState />;
  }
  
  if (error && !data) {
    return <ErrorState error={error} onRetry={() => fetchData()} />;
  }
  
  if (!data) return null;
  
  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <h1 className="header-title">{l.title}</h1>
          <div className="header-controls">
            <LanguageToggle language={language} onToggle={toggleLanguage} />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <RefreshButton onRefresh={handleRefresh} loading={refreshing} />
          </div>
        </div>
        <p className="subtitle">{l.subtitle}</p>
      </header>
      
      <main className="main">
        {/* Primary Resources */}
        <section className="section resources">
          <div className="resource-cards">
            <LinkButton link={data.lectureNotes[language]} variant="primary">
              <svg className="resource-icon-inline" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                <path d="M8 7h6" />
                <path d="M8 11h8" />
              </svg>
              <span className="resource-label-full">{l.lectureNotes}</span>
              <span className="resource-label-short">{l.lectureNotesShort}</span>
            </LinkButton>
            
            <LinkButton link={data.moodle[language]} variant="primary">
              <svg className="resource-icon-inline" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
              <span className="resource-label-full">{l.moodle}</span>
              <span className="resource-label-short">{l.moodleShort}</span>
            </LinkButton>
          </div>
        </section>
        
        {/* Exercises */}
        <section className="section exercises">
          <h2>{l.exercises}</h2>
          <div className="exercises-grid">
            {data.exercises.map((exercise) => (
              <ExerciseCard 
                key={exercise.number} 
                exercise={exercise} 
                language={language} 
              />
            ))}
          </div>
        </section>
      </main>
      
      <footer className="footer">
        <div className="footer-content">
          <p>
            {l.fetchedAt}: {data.fetchedAt.toLocaleString()}
          </p>
          <a 
            href={SOURCE_URL} 
            target="_blank" 
            rel="noopener noreferrer"
            className="source-link"
          >
            {l.sourceLink}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}

// ============================================================================
// Mount
// ============================================================================

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
