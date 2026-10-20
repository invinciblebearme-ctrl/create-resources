import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Search,
  ArrowUpRight,
  RotateCcw,
  X,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  BookOpen,
  FolderOpen,
  CheckCircle2
} from 'lucide-react';
import './style.css';
import Admin from './Admin.jsx';

const tintClasses = ['blue', 'mint', 'peach', 'lavender', 'pink', 'aqua'];
const icons = ['🌟', '🧩', '🎮', '🧰', '🌱', '📐', '🌏', '🔬', '📖', '➗', '✏️', '💡', '🚀', '🎨'];

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
  const [hasLocalDraft, setHasLocalDraft] = useState(false);

  useEffect(() => {
    // 로컬 스토리지에 작업 중인 드래프트가 있는지 우선 확인
    try {
      const localDraft = localStorage.getItem('padlet-library-draft-v3');
      if (localDraft) {
        const parsed = JSON.parse(localDraft);
        if (parsed.sections && parsed.posts) {
          setData(parsed);
          setHasLocalDraft(true);
          return;
        }
      }
    } catch { }

    setHasLocalDraft(false);
    // 정적 JSON 데이터 fetch (실시간 캐시 방지)
    fetch(`${import.meta.env.BASE_URL}padlet-data.json?v=${Date.now()}`, { cache: 'no-store' })
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
    return [...data.sections].sort((a, b) => (a.order ?? a.sort_index ?? 0) - (b.order ?? b.sort_index ?? 0));
  }, [data]);

  const posts = useMemo(() => {
    return data?.posts || [];
  }, [data]);

  const selectedSection = sections.find(s => s.id === selected);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        sections.map(s => [s.id, posts.filter(p => (p.sectionId || p.section_id) === s.id).length])
      ),
    [sections, posts]
  );

  const results = useMemo(() => {
    return posts.filter(
      p => {
        const secId = p.sectionId || p.section_id;
        const desc = p.description || p.body || '';
        const title = p.title || '';
        return (
          (selected === 'all' || secId === selected) &&
          `${title} ${desc} ${sections.find(s => s.id === secId)?.title || ''}`
            .toLowerCase()
            .includes(query.trim().toLowerCase())
        );
      }
    );
  }, [posts, selected, query, sections]);

  const sectionTitle = id => sections.find(s => s.id === id)?.title || '기타 분류';
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
          setHasLocalDraft(false);
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

  const boardTitle = data?.boardTitle || data?.board?.title || '우리들의 AI·디지털 학습 자료실';
  const boardDesc = data?.board?.description || '수업에 필요한 재미있고 유익한 AI·디지털 교수학습 자료를 자유롭게 탐색해 보세요!';

  return (
    <>
      {/* 상단 장식 라인 (create.allforedu.kr 통일) */}
      <div className="top-line" aria-hidden="true">
        ✦　✧　✦　✧　✦
      </div>

      {/* 로컬 임시 수정본 안내 배너 (관리자 브라우저에만 표시) */}
      {hasLocalDraft && (
        <aside className="local-draft-banner shell" role="status">
          <span>💡 <strong>현재 브라우저에만 보이는 로컬 임시 수정본</strong>입니다. 모든 사용자(학생, 선생님)에게 반영하려면 관리자 화면에서 <strong>[모든 사용자에게 배포]</strong>를 눌러주세요.</span>
          <a href="#admin" className="banner-link">관리자 화면 열기 →</a>
        </aside>
      )}

      {/* 브랜드 사이트 헤더 (AI DIGITAL Research School 일체형 내비게이션) */}
      <header className="site-header shell">
        <a
          href="https://create.allforedu.kr"
          className="brand"
          aria-label="AI DIGITAL 연구학교 메인으로 이동"
          title="AI DIGITAL 메인 플랫폼으로 이동"
          onClick={e => {
            window.location.href = 'https://create.allforedu.kr';
          }}
        >
          <span className="brand-icon">✳</span>
          <span>
            <strong>AI DIGITAL</strong>
            <small>RESEARCH SCHOOL</small>
          </span>
        </a>
        <nav className="nav" aria-label="주 메뉴">
          <a href="https://create.allforedu.kr" className="nav-btn">
            메인 플랫폼
          </a>
          <button className="nav-btn active" onClick={() => setSelected('all')}>
            학습 자료실
          </button>
          <a href="#admin" className="nav-btn admin-btn">
            <Shield size={13} /> 관리자
          </a>
        </nav>
      </header>

      <main className="shell" id="top">
        {/* 상단 히어로 섹션 (create.allforedu.kr 톤앤매너 통일) */}
        <section className="hero">
          <span className="floating f1" aria-hidden="true">
            ✏️
          </span>
          <span className="floating f2" aria-hidden="true">
            📚
          </span>
          <span className="floating f3" aria-hidden="true">
            ✨
          </span>

          <div className="hero-inner">
            <span className="eyebrow">✦ AI·DIGITAL LEARNING LIBRARY ✦</span>
            <h1>
              함께 나누고,
              <br />
              <span>배움을 실천하는 자료실</span>
            </h1>
            <p>
              {boardTitle}
              <br className="desktop-break" />
              {boardDesc}
            </p>
          </div>

          <div className="hero-chips">
            <span>
              📁 {sections.length}개 자료 분류
            </span>
            <span>
              🌟 {posts.length}개 학습 자료
            </span>
            <span>
              🏫 AI·디지털 연구학교
            </span>
          </div>
        </section>

        {/* 인트로 스트립 (create.allforedu.kr 통일 요소) */}
        <section className="intro-strip" aria-label="플랫폼 소개">
          <div>
            <span className="intro-icon">🌱</span>
            <div>
              <strong>설계에서 실천까지</strong>
              <p>연구학교의 다양한 AI·디지털 교수학습 자료를 쉽고 편리하게 공유합니다.</p>
            </div>
          </div>
          <div className="intro-count">
            <strong>{posts.length}</strong>
            <span>자료 공유</span>
          </div>
        </section>

        {/* 자료 탐색 섹션 */}
        <section className="library" id="library">
          <div className="section-top">
            <div>
              <span className="kicker">EXPLORE LEARNING MATERIALS</span>
              <h2>
                {selectedSection ? `${selectedSection.title} 자료` : '학습 자료 둘러보기'}{' '}
                <span className="sparkle">✦</span>
              </h2>
              <p>AI 디지털 활용 교수학습 자료를 학년 교과 주제별로 찾아보고 활용해보세요.</p>
            </div>
            <span className="section-badge">
              {results.length}개의 추천 자료
            </span>
          </div>

          {/* 분류 탭 & 실시간 검색창 */}
          <div className="controls">
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

            <label className="search" aria-label="자료 검색">
              <Search size={18} />
              <input
                placeholder="찾고 싶은 자료를 검색하세요"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              {query && (
                <button aria-label="검색어 지우기" onClick={() => setQuery('')}>
                  <X size={16} />
                </button>
              )}
            </label>
          </div>

          {/* 결과 개수 및 필터 초기화 */}
          <div className="results-label">
            <span>
              전체 <strong>{results.length}</strong>개 학습 콘텐츠
            </span>
            {(selected !== 'all' || query) && (
              <button
                onClick={() => {
                  setSelected('all');
                  setQuery('');
                }}
              >
                필터 초기화 ↺
              </button>
            )}
          </div>

          {/* 카드 그리드 */}
          {error ? (
            <div className="empty">
              <span>⚠️</span>
              <h3>자료를 불러오는 데 실패했습니다</h3>
              <p>{error}</p>
            </div>
          ) : !data ? (
            <div className="empty">
              <div className="spinner"></div>
              <p>자료를 불러오는 중입니다...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="empty">
              <span>🔍</span>
              <h3>검색 결과가 없어요</h3>
              <p>다른 검색어를 입력하거나 필터를 초기화해 주세요.</p>
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
              {results.map((p, idx) => {
                const secId = p.sectionId || p.section_id;
                const href = p.url || p.attachment?.url || '';
                const padletLink = p.padletUrl || (p.attachment?.url ? (p.url || '') : (p.url?.includes('padlet.com') ? p.url : ''));
                const secIdx = sections.findIndex(s => s.id === secId);
                const tint = tintClasses[(Math.max(0, secIdx) + tintClasses.length) % tintClasses.length];
                const itemNumber = String(idx + 1).padStart(2, '0');
                const title = p.title || (href ? '웹앱 바로가기' : '학습 자료');
                const desc = p.description || p.body || '선생님과 학생이 함께 활용하는 AI·디지털 학습 자료입니다.';

                return (
                  <article className={`content-card ${tint}`} key={p.id}>
                    <div className="card-top">
                      <span className="card-emoji" aria-hidden="true">
                        {sectionIcon(secId)}
                      </span>
                      <span className="type-tag">{sectionTitle(secId)}</span>
                    </div>

                    <div className="card-no">CONTENT {itemNumber}</div>
                    <h3>{title}</h3>
                    <p className="card-desc">
                      {desc}
                    </p>

                    <div className="card-bottom">
                      <span className={`status ${href ? 'ready' : 'planned'}`}>
                        {href ? (
                          <>
                            <CheckCircle2 size={13} /> 바로 이용
                          </>
                        ) : (
                          '자료 준비 중'
                        )}
                      </span>

                      <div className="card-links-group">
                        {href && (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="card-action-btn primary"
                          >
                            자료 열기 <ArrowUpRight size={15} />
                          </a>
                        )}
                        {padletLink && (
                          <a
                            href={padletLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="card-action-btn subtle"
                            title="패들렛 원본 게시물"
                          >
                            <ExternalLink size={13} /> 패들렛
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* 푸터 (create.allforedu.kr 통일) */}
      <footer>
        <div className="shell footer-inner">
          <div>
            <strong>✳ AI DIGITAL 연구학교 학습 자료실</strong>
            <p>수업의 성장과 배움의 나눔을 위한 AI·디지털 성과 공유 플랫폼</p>
          </div>
          <div className="footer-links">
            <a href="https://create.allforedu.kr">메인 플랫폼</a>
            <span className="footer-divider">·</span>
            <a href="#admin">관리자 설정</a>
            <span className="footer-divider">·</span>
            <span>© AI DIGITAL Research School</span>
          </div>
        </div>
      </footer>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
