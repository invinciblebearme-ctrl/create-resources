import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Search,
  ArrowUpRight,
  BookOpen,
  Sparkles,
  RotateCcw,
  Link2,
  Layers,
  X,
  ExternalLink,
  Shield,
  FolderOpen
} from 'lucide-react';
import './style.css';
import Admin from './Admin.jsx';

const icons = ['🌟', '🧩', '🎮', '🧰', '🌱', '📐', '🌏', '🔬', '📖', '➗', '✏️', '💡', '🚀', '🎨', '🔍'];
const colors = ['#eef4ff', '#fff0ed', '#f0efff', '#eaf9f3', '#fff6e7', '#e9f7ff', '#f3e8ff', '#fef2f2'];

function App() {
  const [isAdmin, setIsAdmin] = useState(window.location.hash === '#admin');

  useEffect(() => {
    const onHash = () => setIsAdmin(window.location.hash === '#admin');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    // 로컬 스토리지에 작업 중인 드래프트가 있는지 우선 확인
    try {
      const localDraft = localStorage.getItem('padlet-library-draft-v2');
      if (localDraft) {
        const parsed = JSON.parse(localDraft);
        if (parsed.sections && parsed.posts) {
          setData(parsed);
          return;
        }
      }
    } catch {}

    // 정적 JSON 데이터 fetch
    fetch(`${import.meta.env.BASE_URL}padlet-data.json`)
      .then(r => {
        if (!r.ok) throw new Error('자료를 불러올 수 없습니다.');
        return r.json();
      })
      .then(fetched => {
        setData(fetched);
      })
      .catch(e => setError(e.message));
  }, []);

  const sections = useMemo(() => {
    if (!data?.sections) return [];
    return [...data.sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [data]);

  const posts = useMemo(() => {
    return data?.posts || [];
  }, [data]);

  const selectedSection = sections.find(s => s.id === selected);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        sections.map(s => [s.id, posts.filter(p => p.sectionId === s.id).length])
      ),
    [sections, posts]
  );

  const results = useMemo(() => {
    return posts.filter(
      p =>
        (selected === 'all' || p.sectionId === selected) &&
        `${p.title} ${p.description || ''} ${sections.find(s => s.id === p.sectionId)?.title || ''}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())
    );
  }, [posts, selected, query, sections]);

  const sectionTitle = id => sections.find(s => s.id === id)?.title || '기타';
  const sectionIcon = id => {
    const idx = sections.findIndex(s => s.id === id);
    if (idx === -1) return '📚';
    return icons[(idx + 1) % icons.length];
  };

  if (isAdmin) {
    return data ? (
      <Admin
        initial={data}
        onSaved={updated => {
          setData(updated);
        }}
        onExit={() => {
          window.location.hash = '';
          setIsAdmin(false);
        }}
      />
    ) : (
      <div className="empty-loading">
        <div className="spinner"></div>
        <p>자료실 데이터를 불러오는 중입니다... {error}</p>
      </div>
    );
  }

  const boardTitle = data?.boardTitle || '우리들의 AI·디지털 학습 자료실';

  return (
    <>
      <div className="top-decoration" aria-hidden="true">
        ✦ ✧ ✦
      </div>
      <main className="container">
        {/* 상단 히어로 섹션 */}
        <header className="hero">
          <div className="hero-orb orb-one">📚</div>
          <div className="hero-orb orb-two">✏️</div>
          <div className="hero-orb orb-three">✨</div>
          <span className="eyebrow">📋 AI · DIGITAL LEARNING LIBRARY</span>
          <h1>
            {boardTitle.includes('AI·디지털') ? (
              <>
                {boardTitle.split('AI·디지털')[0]}
                <span>AI·디지털</span>
                {boardTitle.split('AI·디지털')[1]}
              </>
            ) : (
              <span>{boardTitle}</span>
            )}
          </h1>
          <p>수업에 필요한 재미있고 유익한 디지털 학습 자료를 골라서 탐험해 보세요!</p>
          <div className="hero-stats">
            <span>
              <FolderOpen size={16} /> {sections.length}개 자료 분류
            </span>
            <span>
              <Sparkles size={16} /> {posts.length}개 학습 자료
            </span>
          </div>
        </header>

        {/* 자료 검색 및 분류 브라우저 */}
        <section className="browser" aria-label="자료 검색 및 분류">
          <div className="section-heading">
            <div>
              <span className="kicker">EXPLORE THE LIBRARY</span>
              <h2>
                어떤 자료를 찾아볼까요? <span className="icon-pulse">🔎</span>
              </h2>
            </div>
            <span className="small-hint">원하는 분류나 검색어를 선택해 보세요!</span>
          </div>

          <div className="searchbox">
            <Search size={20} />
            <input
              aria-label="자료 검색"
              placeholder="자료 이름, 내용 설명, 교과명을 검색해 보세요"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button
                className="clear"
                aria-label="검색어 지우기"
                onClick={() => setQuery('')}
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div className="filter-list" role="group" aria-label="자료 분류">
            <button
              className={`filter ${selected === 'all' ? 'active' : ''}`}
              aria-pressed={selected === 'all'}
              onClick={() => setSelected('all')}
            >
              <span>🌈</span> 전체 자료 <em>{posts.length}</em>
            </button>
            {sections.map((s, i) => (
              <button
                key={s.id}
                className={`filter ${selected === s.id ? 'active' : ''}`}
                aria-pressed={selected === s.id}
                onClick={() => setSelected(s.id)}
              >
                <span>{icons[(i + 1) % icons.length]}</span>
                {s.title}
                <em>{counts[s.id] ?? 0}</em>
              </button>
            ))}
          </div>
        </section>

        {/* 결과 카드 그리드 */}
        <section className="results" aria-live="polite">
          <div className="result-heading">
            <div>
              <span className="kicker">LEARNING MATERIALS</span>
              <h2>
                {selectedSection
                  ? `${sectionIcon(selected)} ${selectedSection.title}`
                  : '🌟 전체 학습 자료'}{' '}
                <span className="count">{results.length}</span>
              </h2>
            </div>
            {(selected !== 'all' || query) && (
              <button
                className="reset"
                onClick={() => {
                  setSelected('all');
                  setQuery('');
                }}
              >
                <RotateCcw size={16} /> 전체 보기
              </button>
            )}
          </div>

          {error ? (
            <div className="empty">
              <div className="empty-icon">⚠️</div>
              <strong>자료를 불러오는 데 실패했습니다</strong>
              <p>{error}</p>
            </div>
          ) : !data ? (
            <div className="empty">
              <div className="spinner"></div>
              <p>📚 자료를 불러오는 중입니다...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🔍</div>
              <strong>검색 결과가 없어요</strong>
              <p>다른 검색어를 입력하거나 다른 분류를 선택해 보세요.</p>
              <button
                onClick={() => {
                  setSelected('all');
                  setQuery('');
                }}
              >
                전체 자료 보기
              </button>
            </div>
          ) : (
            <div className="card-grid">
              {results.map(p => {
                const href = p.url || p.padletUrl;
                const idx = sections.findIndex(s => s.id === p.sectionId);
                const bgColor = colors[(Math.max(0, idx) + colors.length) % colors.length];

                return (
                  <article
                    className="resource-card"
                    key={p.id}
                    style={{ '--card-bg': bgColor }}
                  >
                    <div className="card-head">
                      <span className="card-icon">{sectionIcon(p.sectionId)}</span>
                      <span className="category">{sectionTitle(p.sectionId)}</span>
                    </div>
                    <h3>{p.title}</h3>
                    <p className="description">
                      {p.description || '자료를 열어 직접 확인해 보세요!'}
                    </p>
                    <div className="card-footer">
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="open-link"
                        >
                          {p.url ? '자료 열어보기' : '게시물 보기'}{' '}
                          <ArrowUpRight size={17} />
                        </a>
                      ) : (
                        <span className="no-link">연결된 링크 없음</span>
                      )}
                      {p.url && p.padletUrl && (
                        <a
                          className="padlet-link"
                          href={p.padletUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="패들렛 원본 게시물"
                          aria-label={`${p.title} 패들렛 원본`}
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* 푸터 */}
        <footer>
          <div className="footer-content">
            <p>
              📚 함께 나누고, 함께 배우는 AI·디지털 학습 자료실 <span>·</span> 자료 출처: Padlet
            </p>
            <a href="#admin" className="admin-entry">
              <Shield size={14} /> 관리자 설정
            </a>
          </div>
        </footer>
      </main>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
