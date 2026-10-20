import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Download,
  Upload,
  Save,
  CloudUpload,
  Search,
  X,
  FolderPlus,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Lock,
  Unlock,
  RotateCcw,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Settings,
  Link as LinkIcon
} from 'lucide-react';

const emptyPost = { title: '', description: '', url: '', padletUrl: '', sectionId: '' };
const uid = prefix => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const validUrl = value => !value || /^https?:\/\/\S+$/i.test(value.trim());

function normalize(raw) {
  if (!raw || !Array.isArray(raw.posts) || !Array.isArray(raw.sections)) {
    throw new Error('sections와 posts 배열이 포함된 학습자료 JSON 파일이 필요합니다.');
  }
  const ids = new Set(raw.sections.map(s => s.id));
  if (raw.sections.some(s => !s.id || !s.title)) {
    throw new Error('각 섹션에 유효한 id와 title이 있어야 합니다.');
  }
  return {
    boardTitle: String(raw.boardTitle || '우리들의 AI·디지털 학습 자료실'),
    sections: [...raw.sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    posts: [...raw.posts]
  };
}

function toBase64Unicode(value) {
  const bytes = new TextEncoder().encode(value);
  let str = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    str += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(str);
}

function safePath(s) {
  return s.split('/').map(encodeURIComponent).join('/');
}

async function githubCall(url, token, options = {}) {
  const r = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  if (!r.ok) {
    let info = '';
    try {
      const j = await r.json();
      info = j.message || '';
    } catch {}
    throw new Error(`GitHub ${r.status}: ${info || '요청 실패'}`);
  }
  return r.json();
}

const icons = ['🌟', '🧩', '🎮', '🧰', '🌱', '📐', '🌏', '🔬', '📖', '➗', '✏️', '💡'];
const colors = ['#eef4ff', '#fff0ed', '#f0efff', '#eaf9f3', '#fff6e7', '#e9f7ff'];

export default function Admin({ initial, onExit, onSaved }) {
  // PIN 보안 잠금 (기본 PIN: 1234, 세션 스토리지 인증)
  const [unlocked, setUnlocked] = useState(() => {
    return sessionStorage.getItem('padlet_admin_unlocked') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // 메인 데이터 상태
  const [data, setData] = useState(() => {
    try {
      const raw = localStorage.getItem('padlet-library-draft-v2');
      return raw ? normalize(JSON.parse(raw)) : normalize(structuredClone(initial));
    } catch {
      return normalize(structuredClone(initial));
    }
  });

  const [dirty, setDirty] = useState(false);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('default'); // 'default' | 'title'

  // 모달 상태
  const [editing, setEditing] = useState(null); // Post editing
  const [sectionEditing, setSectionEditing] = useState(null); // Section editing
  const [deleteSectionTarget, setDeleteSectionTarget] = useState(null); // Section delete with post resolver
  const [targetMoveSectionId, setTargetMoveSectionId] = useState('');
  const [titleEditing, setTitleEditing] = useState(false);
  const [tempBoardTitle, setTempBoardTitle] = useState(data.boardTitle);

  // 알림 토스트 상태
  const [notice, setNotice] = useState(null); // { text, type: 'info' | 'success' | 'error' }
  const [busy, setBusy] = useState(false);

  // GitHub 연동 정보 (기본값 설정)
  const [git, setGit] = useState({
    owner: 'invinciblebearme-ctrl',
    repo: 'create-resources',
    branch: 'main',
    path: 'public/padlet-data.json',
    commitMessage: '자료실 데이터 업데이트 (Admin 관리자)',
    token: ''
  });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('padlet-library-github-config') || '{}');
      setGit(old => ({
        ...old,
        ...saved,
        token: '' // 토큰은 보안상 비워둠
      }));
    } catch {}
  }, []);

  // 로컬 초안 자동 동기화
  useEffect(() => {
    localStorage.setItem('padlet-library-draft-v2', JSON.stringify(data));
  }, [data]);

  const showNotice = (text, type = 'info') => {
    setNotice({ text, type });
  };

  const update = next => {
    setData(next);
    setDirty(true);
    showNotice('변경사항이 브라우저 로컬 저장소에 반영되었습니다. (GitHub에 게시하면 영구 배포됩니다)', 'info');
  };

  // PIN 인증 확인 (기본 비밀번호: 7703, 공백 자동 제거 및 호환 지원)
  const handleUnlock = e => {
    e.preventDefault();
    const entered = (pinInput || '').trim();
    if (entered === '7703' || entered === '1234') {
      localStorage.setItem('padlet_admin_pin', '7703');
      sessionStorage.setItem('padlet_admin_unlocked', 'true');
      setUnlocked(true);
      setPinError('');
    } else {
      setPinError('비밀번호가 올바르지 않습니다.');
    }
  };

  const handleLock = () => {
    sessionStorage.removeItem('padlet_admin_unlocked');
    setUnlocked(false);
    setPinInput('');
  };

  // 타이틀 변경 저장
  const handleSaveBoardTitle = () => {
    if (!tempBoardTitle.trim()) {
      showNotice('자료실 제목을 입력해 주세요.', 'error');
      return;
    }
    update({ ...data, boardTitle: tempBoardTitle.trim() });
    setTitleEditing(false);
    showNotice('자료실 제목이 변경되었습니다.', 'success');
  };

  // 섹션 순서 변경
  const moveSection = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= data.sections.length) return;
    const newSections = [...data.sections];
    const [moved] = newSections.splice(index, 1);
    newSections.splice(targetIdx, 0, moved);
    // order 값 재설정
    const updated = newSections.map((s, i) => ({ ...s, order: (i + 1) * 10 }));
    update({ ...data, sections: updated });
  };

  // 섹션 저장 (추가/수정)
  const saveSection = () => {
    const s = sectionEditing;
    if (!s.title.trim()) {
      showNotice('섹션 이름을 입력해 주세요.', 'error');
      return;
    }
    if (data.sections.some(x => x.id === s.id)) {
      update({
        ...data,
        sections: data.sections.map(x => (x.id === s.id ? { ...x, title: s.title.trim() } : x))
      });
      showNotice(`'${s.title}' 섹션이 수정되었습니다.`, 'success');
    } else {
      const maxOrder = Math.max(0, ...data.sections.map(x => x.order || 0));
      const newSec = { ...s, title: s.title.trim(), order: maxOrder + 10 };
      update({
        ...data,
        sections: [...data.sections, newSec]
      });
      showNotice(`새 섹션 '${s.title}'이 추가되었습니다.`, 'success');
    }
    setSectionEditing(null);
  };

  // 섹션 삭제 트리거
  const handleRequestDeleteSection = s => {
    const postCount = data.posts.filter(p => p.sectionId === s.id).length;
    if (postCount > 0) {
      // 해결 모달 오픈
      const remainingSections = data.sections.filter(x => x.id !== s.id);
      setTargetMoveSectionId(remainingSections[0]?.id || '');
      setDeleteSectionTarget({ section: s, postCount });
    } else {
      if (confirm(`'${s.title}' 섹션을 삭제하시겠습니까?`)) {
        update({
          ...data,
          sections: data.sections.filter(x => x.id !== s.id)
        });
        showNotice(`'${s.title}' 섹션이 삭제되었습니다.`, 'info');
      }
    }
  };

  // 섹션 삭제 처리 (게시물 이동 또는 일괄 삭제)
  const executeDeleteSectionWithAction = action => {
    if (!deleteSectionTarget) return;
    const { section } = deleteSectionTarget;
    if (action === 'move') {
      if (!targetMoveSectionId) {
        showNotice('이동할 대상 섹션을 선택해 주세요.', 'error');
        return;
      }
      const movedPosts = data.posts.map(p =>
        p.sectionId === section.id ? { ...p, sectionId: targetMoveSectionId } : p
      );
      update({
        ...data,
        sections: data.sections.filter(x => x.id !== section.id),
        posts: movedPosts
      });
      showNotice(`게시물을 이동하고 '${section.title}' 섹션을 삭제했습니다.`, 'success');
    } else if (action === 'cascade') {
      update({
        ...data,
        sections: data.sections.filter(x => x.id !== section.id),
        posts: data.posts.filter(p => p.sectionId !== section.id)
      });
      showNotice(`'${section.title}' 섹션과 포함된 게시물을 모두 삭제했습니다.`, 'info');
    }
    setDeleteSectionTarget(null);
  };

  // 게시물 저장
  const savePost = () => {
    const p = editing;
    const trimmedTitle = p.title?.trim();
    const trimmedUrl = p.url?.trim() || '';
    const trimmedPadletUrl = p.padletUrl?.trim() || '';

    if (!trimmedTitle || !p.sectionId) {
      showNotice('게시물 제목과 분류 섹션을 선택해 주세요.', 'error');
      return;
    }
    if (!validUrl(trimmedUrl) || !validUrl(trimmedPadletUrl)) {
      showNotice('링크는 http:// 또는 https://로 시작해야 합니다.', 'error');
      return;
    }

    const payload = {
      ...p,
      title: trimmedTitle,
      description: p.description?.trim() || '',
      url: trimmedUrl,
      padletUrl: trimmedPadletUrl
    };

    if (data.posts.some(x => x.id === payload.id)) {
      update({
        ...data,
        posts: data.posts.map(x => (x.id === payload.id ? payload : x))
      });
      showNotice(`'${payload.title}' 게시물이 수정되었습니다.`, 'success');
    } else {
      update({
        ...data,
        posts: [{ ...payload, sortIndex: Date.now() }, ...data.posts]
      });
      showNotice(`새 게시물 '${payload.title}'이 등록되었습니다.`, 'success');
    }
    setEditing(null);
  };

  // 게시물 순서 변경
  const movePost = (id, direction) => {
    const idx = data.posts.findIndex(p => p.id === id);
    if (idx === -1) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= data.posts.length) return;
    const nextPosts = [...data.posts];
    const [moved] = nextPosts.splice(idx, 1);
    nextPosts.splice(targetIdx, 0, moved);
    update({ ...data, posts: nextPosts });
  };

  // 원본 데이터로 초기화
  const resetToOriginal = () => {
    if (
      confirm(
        '정말로 모든 로컬 수정사항을 버리고 최초 원본(public/padlet-data.json) 데이터로 복원하시겠습니까?\n이 작업은 취소할 수 없습니다.'
      )
    ) {
      localStorage.removeItem('padlet-library-draft-v2');
      const resetData = normalize(structuredClone(initial));
      setData(resetData);
      setDirty(false);
      showNotice('데이터가 최초 원본 상태로 복원되었습니다.', 'success');
    }
  };

  // JSON 파일 다운로드
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], {
      type: 'application/json;charset=utf-8'
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'padlet-data.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showNotice('JSON 파일(padlet-data.json)을 다운로드했습니다.', 'success');
  };

  // JSON 파일 가져오기
  const importJson = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const obj = normalize(JSON.parse(await file.text()));
      if (
        confirm(
          `불러온 파일에서 섹션 ${obj.sections.length}개, 게시물 ${obj.posts.length}개를 감지했습니다.\n현재 편집 내용을 이 데이터로 교체하시겠습니까?`
        )
      ) {
        update(obj);
        showNotice('JSON 파일을 성공적으로 가져왔습니다.', 'success');
      }
    } catch (err) {
      showNotice(`가져오기 실패: ${err.message}`, 'error');
    }
  };

  // GitHub에 게시
  const publish = async () => {
    const { owner, repo, branch, path, token, commitMessage } = git;
    if (!owner || !repo || !branch || !path || !token) {
      showNotice('GitHub 소유자, 저장소 이름, 브랜치, 경로와 개인 액세스 토큰(PAT)을 모두 입력하세요.', 'error');
      return;
    }

    if (
      !confirm(
        `[${owner}/${repo}] 저장소의 '${branch}' 브랜치에 '${path}' 파일을 커밋하시겠습니까?\n커밋 후 Cloudflare Pages에서 자동 빌드 및 배포가 진행됩니다.`
      )
    ) {
      return;
    }

    setBusy(true);
    showNotice('GitHub 저장소의 기존 파일 정보를 확인하고 있습니다...', 'info');

    try {
      const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo
      )}/contents/${safePath(path)}`;
      const url = `${base}?ref=${encodeURIComponent(branch)}`;
      let sha;

      try {
        const existing = await githubCall(url, token);
        sha = existing.sha;
      } catch (e) {
        if (!e.message.includes('GitHub 404:')) throw e;
      }

      await githubCall(base, token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: commitMessage || 'Update learning library data via admin',
          content: toBase64Unicode(JSON.stringify(data, null, 2) + '\n'),
          branch,
          ...(sha ? { sha } : {})
        })
      });

      // 설정 저장 (토큰 제외)
      localStorage.setItem(
        'padlet-library-github-config',
        JSON.stringify({ owner, repo, branch, path, commitMessage })
      );
      setDirty(false);
      showNotice(
        `성공적으로 GitHub에 게시되었습니다! (커밋 완료)\nCloudflare Pages 자동 배포가 완료되면 수 분 내에 사이트에 반영됩니다.`,
        'success'
      );
      if (onSaved) onSaved(data);
    } catch (e) {
      showNotice(`게시 실패: ${e.message} (토큰의 Contents: Read and write 권한 및 저장소 이름을 확인하세요)`, 'error');
    } finally {
      setBusy(false);
    }
  };

  // 필터 및 검색된 게시물 목록
  const sectionName = id => data.sections.find(s => s.id === id)?.title || '미분류';
  const rows = useMemo(() => {
    let list = data.posts.filter(
      p =>
        (filter === 'all' || p.sectionId === filter) &&
        `${p.title} ${p.description || ''} ${sectionName(p.sectionId)}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())
    );
    if (sortOrder === 'title') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title, 'ko'));
    }
    return list;
  }, [data, filter, query, sortOrder]);

  // PIN 잠금 화면 렌더링
  if (!unlocked) {
    return (
      <div className="admin-lock-screen">
        <div className="lock-card">
          <div className="lock-icon-wrap">
            <Lock size={36} />
          </div>
          <h2>관리자 화면 잠금</h2>
          <p>
            학습 자료실 설정 및 데이터 수정을 위해<br />
            관리자 비밀번호를 입력해 주세요.
          </p>
          <form onSubmit={handleUnlock} className="lock-form">
            <input
              type="password"
              placeholder="비밀번호 입력"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              autoFocus
            />
            {pinError && <div className="lock-error">{pinError}</div>}
            <div className="lock-buttons">
              <button type="button" className="admin-button" onClick={onExit}>
                <ArrowLeft size={16} /> 자료실로 나가기
              </button>
              <button type="submit" className="admin-button primary">
                <Unlock size={16} /> 잠금 해제
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      {/* 상단 네비게이션 바 */}
      <div className="admin-top">
        <button className="admin-button subtle" onClick={onExit}>
          <ArrowLeft size={17} /> 자료실 돌아가기
        </button>
        <div className="admin-top-right">
          <span className="badge-live">관리자 모드 활성</span>
          <button className="admin-button subtle small" onClick={handleLock} title="관리자 잠금">
            <Lock size={15} /> 잠금
          </button>
        </div>
      </div>

      {/* 헤더 & 타이틀 에디터 */}
      <div className="admin-intro">
        <div className="intro-main">
          <span className="kicker">LIBRARY MANAGEMENT SYSTEM</span>
          {titleEditing ? (
            <div className="title-edit-box">
              <input
                value={tempBoardTitle}
                onChange={e => setTempBoardTitle(e.target.value)}
                autoFocus
                placeholder="자료실 제목"
              />
              <button className="admin-button primary small" onClick={handleSaveBoardTitle}>
                <Save size={14} /> 저장
              </button>
              <button
                className="admin-button small"
                onClick={() => {
                  setTempBoardTitle(data.boardTitle);
                  setTitleEditing(false);
                }}
              >
                취소
              </button>
            </div>
          ) : (
            <div className="title-view-box">
              <h1>{data.boardTitle}</h1>
              <button
                className="btn-icon"
                onClick={() => {
                  setTempBoardTitle(data.boardTitle);
                  setTitleEditing(true);
                }}
                title="자료실 제목 수정"
              >
                <Pencil size={18} />
              </button>
            </div>
          )}
          <p>
            게시물과 분류(섹션)를 관리하고, 변경사항을 다운로드하거나 GitHub 및 Cloudflare Pages에 즉시 반영할 수 있습니다.
          </p>
        </div>
        <div className="admin-stat-cluster">
          <div className="stat-pill">
            <span className="stat-label">분류(섹션)</span>
            <span className="stat-val">{data.sections.length}개</span>
          </div>
          <div className="stat-pill">
            <span className="stat-label">등록 자료</span>
            <span className="stat-val">{data.posts.length}개</span>
          </div>
        </div>
      </div>

      {/* 상태 알림 토스트 / 배너 */}
      {notice && (
        <div className={`admin-notice ${notice.type}`} role="status">
          <div className="notice-content">
            {notice.type === 'success' && <CheckCircle2 size={18} />}
            {notice.type === 'error' && <AlertCircle size={18} />}
            {notice.type === 'info' && <Settings size={18} />}
            <span>{notice.text}</span>
          </div>
          <button onClick={() => setNotice(null)} aria-label="알림 닫기">
            <X size={15} />
          </button>
        </div>
      )}

      {/* 상단 주요 액션 바 */}
      <div className="admin-actions">
        <button
          className="admin-button primary"
          onClick={() =>
            setEditing({
              ...emptyPost,
              id: uid('post'),
              sectionId: data.sections[0]?.id || '',
              sortIndex: Date.now()
            })
          }
          disabled={!data.sections.length}
        >
          <Plus size={17} /> 새 게시물 추가
        </button>
        <button
          className="admin-button"
          onClick={() => setSectionEditing({ id: uid('sec'), title: '', order: Date.now() })}
        >
          <FolderPlus size={17} /> 새 섹션(분류) 추가
        </button>
        <label className="admin-button file-button">
          <Upload size={17} /> JSON 파일 불러오기
          <input type="file" accept=".json,application/json" onChange={importJson} />
        </label>
        <button className="admin-button" onClick={exportJson}>
          <Download size={17} /> JSON 다운로드
        </button>
        <button className="admin-button danger-subtle" onClick={resetToOriginal} title="임시 저장본 버리고 원본으로 복구">
          <RotateCcw size={15} /> 원본 데이터 복원
        </button>
      </div>

      {/* 메인 관리 영역 (좌: 섹션 관리, 우: 게시물 관리) */}
      <div className="admin-layout">
        {/* 좌측: 섹션 관리 패널 */}
        <section className="admin-panel section-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>📁 분류(섹션) 순서 및 관리</h2>
              <small>▲▼ 버튼으로 순서 이동 가능</small>
            </div>
            <button
              className="btn-text-action"
              onClick={() => setSectionEditing({ id: uid('sec'), title: '', order: Date.now() })}
            >
              + 추가
            </button>
          </div>

          <div className="section-manager">
            {data.sections.map((s, idx) => {
              const count = data.posts.filter(p => p.sectionId === s.id).length;
              return (
                <div className="section-manage-row" key={s.id}>
                  <div className="sec-info">
                    <span className="sec-order-num">{idx + 1}</span>
                    <strong className="sec-name">{s.title}</strong>
                    <span className="sec-badge">{count}개</span>
                  </div>
                  <div className="sec-controls">
                    <button
                      className="btn-order"
                      disabled={idx === 0}
                      onClick={() => moveSection(idx, -1)}
                      title="위로 이동"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      className="btn-order"
                      disabled={idx === data.sections.length - 1}
                      onClick={() => moveSection(idx, 1)}
                      title="아래로 이동"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      className="btn-action"
                      onClick={() => setSectionEditing({ ...s })}
                      title="섹션 이름 수정"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="btn-action danger"
                      onClick={() => handleRequestDeleteSection(s)}
                      title="섹션 삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 우측: 게시물 관리 패널 */}
        <section className="admin-panel admin-posts">
          <div className="admin-panel-heading">
            <div>
              <h2>📚 학습 자료 게시물 관리</h2>
              <small>총 {rows.length}개 자료 표시 중</small>
            </div>
            <div className="sort-controls">
              <select
                aria-label="게시물 정렬"
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
                className="select-mini"
              >
                <option value="default">등록 순서</option>
                <option value="title">가나다 제목순</option>
              </select>
            </div>
          </div>

          {/* 검색 및 분류 필터 */}
          <div className="admin-search-bar">
            <div className="search-input-wrap">
              <Search size={18} />
              <input
                placeholder="게시물 제목, 설명 검색..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              {query && (
                <button className="clear-btn" onClick={() => setQuery('')}>
                  <X size={15} />
                </button>
              )}
            </div>
            <select
              aria-label="섹션 필터"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="section-filter-select"
            >
              <option value="all">전체 분류 ({data.posts.length})</option>
              {data.sections.map(s => {
                const cnt = data.posts.filter(p => p.sectionId === s.id).length;
                return (
                  <option key={s.id} value={s.id}>
                    {s.title} ({cnt})
                  </option>
                );
              })}
            </select>
          </div>

          {/* 게시물 테이블 */}
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '45%' }}>자료명 및 설명</th>
                  <th style={{ width: '20%' }}>분류(섹션)</th>
                  <th style={{ width: '15%' }}>링크</th>
                  <th style={{ width: '20%', textAlign: 'center' }}>순서 및 관리</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p, idx) => (
                  <tr key={p.id}>
                    <td>
                      <div className="post-cell-title">
                        <strong>{p.title}</strong>
                        {p.description && <p className="post-desc-preview">{p.description}</p>}
                      </div>
                    </td>
                    <td>
                      <span className="post-sec-pill">{sectionName(p.sectionId)}</span>
                    </td>
                    <td>
                      <div className="post-links-cell">
                        {p.url ? (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-badge"
                            title={p.url}
                          >
                            <ExternalLink size={13} /> 바로가기
                          </a>
                        ) : (
                          <span className="no-link-text">링크 없음</span>
                        )}
                        {p.padletUrl && (
                          <a
                            href={p.padletUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="padlet-badge"
                            title="패들렛 원본"
                          >
                            패들렛
                          </a>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn-order"
                          disabled={idx === 0}
                          onClick={() => movePost(p.id, -1)}
                          title="위로 이동"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          className="btn-order"
                          disabled={idx === rows.length - 1}
                          onClick={() => movePost(p.id, 1)}
                          title="아래로 이동"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          className="btn-action"
                          onClick={() => setEditing({ ...p })}
                          title="게시물 수정"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="btn-action danger"
                          onClick={() => {
                            if (confirm(`'${p.title}' 게시물을 삭제하시겠습니까?`)) {
                              update({
                                ...data,
                                posts: data.posts.filter(x => x.id !== p.id)
                              });
                              showNotice(`'${p.title}' 게시물이 삭제되었습니다.`, 'info');
                            }
                          }}
                          title="게시물 삭제"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && (
              <div className="admin-none">
                <Search size={32} />
                <p>일치하는 학습 자료가 없습니다.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* GitHub 및 배포 관리 패널 */}
      <section className="admin-panel publish-panel">
        <div className="admin-panel-heading">
          <div className="publish-heading-content">
            <CloudUpload size={22} className="cloud-icon" />
            <div>
              <h2>GitHub 저장소 동기화 & Cloudflare Pages 자동 배포</h2>
              <small>저장소 원본 JSON에 커밋을 생성하여 실시간 배포를 트리거합니다.</small>
            </div>
          </div>
          <span className={`status-pill ${dirty ? 'dirty' : 'clean'}`}>
            {dirty ? '● 로컬 미반영 수정사항 있음' : '✓ 동기화 준비 완료'}
          </span>
        </div>

        <div className="github-form-grid">
          <label>
            GitHub 사용자/조직 ID
            <input
              placeholder="예: invinciblebearme-ctrl"
              value={git.owner}
              onChange={e => setGit({ ...git, owner: e.target.value.trim() })}
            />
          </label>
          <label>
            GitHub 저장소 (Repo) 이름
            <input
              placeholder="예: create-resources"
              value={git.repo}
              onChange={e => setGit({ ...git, repo: e.target.value.trim() })}
            />
          </label>
          <label>
            배포 대상 브랜치
            <input
              placeholder="main"
              value={git.branch}
              onChange={e => setGit({ ...git, branch: e.target.value.trim() })}
            />
          </label>
          <label>
            데이터 파일 경로
            <input
              placeholder="public/padlet-data.json"
              value={git.path}
              onChange={e => setGit({ ...git, path: e.target.value.trim() })}
            />
          </label>
          <label className="span-two">
            커밋 메시지
            <input
              placeholder="자료실 데이터 업데이트 (Admin)"
              value={git.commitMessage}
              onChange={e => setGit({ ...git, commitMessage: e.target.value })}
            />
          </label>
          <label className="span-two token-input-wrap">
            Personal Access Token (PAT)
            <span className="token-desc">
              * GitHub Token은 브라우저 저장소에 영구 보관되지 않고 안전하게 일회성 API 호출에만 사용됩니다.
            </span>
            <input
              type="password"
              autoComplete="off"
              placeholder="ghp_... 또는 github_pat_..."
              value={git.token}
              onChange={e => setGit({ ...git, token: e.target.value.trim() })}
            />
          </label>
        </div>

        <div className="publish-footer">
          <div className="publish-info">
            💡 <strong>Cloudflare 자동 연동:</strong> GitHub의 <code>{git.repo || 'create-resources'}</code> 저장소가
            Cloudflare Pages와 연결되어 있으면, 여기서 <strong>[GitHub에 게시]</strong> 클릭 시 자동으로 최신 자료실 웹사이트가 재배포됩니다.
          </div>
          <button className="admin-button primary large" disabled={busy} onClick={publish}>
            <CloudUpload size={18} />
            {busy ? 'GitHub에 커밋 푸시 중...' : 'GitHub에 게시 및 배포 실행'}
          </button>
        </div>
      </section>

      {/* 모달 1: 게시물 추가/수정 모달 (실시간 미리보기 카드 내장) */}
      {editing && (
        <div
          className="modal-overlay"
          role="presentation"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setEditing(null);
          }}
        >
          <div className="admin-modal large" role="dialog" aria-modal="true" aria-label="게시물 편집">
            <div className="modal-heading">
              <h2>{data.posts.some(p => p.id === editing.id) ? '✏️ 게시물 수정' : '✨ 새 학습 자료 등록'}</h2>
              <button onClick={() => setEditing(null)} aria-label="닫기">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body-split">
              {/* 입력 폼 */}
              <div className="form-column">
                <label>
                  게시물 제목 *
                  <input
                    value={editing.title}
                    onChange={e => setEditing({ ...editing, title: e.target.value })}
                    placeholder="예: 먹이그물 시뮬레이션 만들기"
                    autoFocus
                  />
                </label>

                <label>
                  분류 섹션 *
                  <select
                    value={editing.sectionId}
                    onChange={e => setEditing({ ...editing, sectionId: e.target.value })}
                  >
                    {data.sections.map(s => (
                      <option value={s.id} key={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  설명 (선택)
                  <textarea
                    rows={3}
                    value={editing.description || ''}
                    onChange={e => setEditing({ ...editing, description: e.target.value })}
                    placeholder="자료에 대한 간단한 소개나 선생님 성함을 적어주세요."
                  />
                </label>

                <label>
                  첨부 사이트 링크 URL
                  <div className="url-input-group">
                    <input
                      value={editing.url || ''}
                      onChange={e => setEditing({ ...editing, url: e.target.value })}
                      placeholder="https://..."
                    />
                    {editing.url && validUrl(editing.url) && (
                      <a
                        href={editing.url.trim()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-test-link"
                        title="새 창에서 링크 확인"
                      >
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </div>
                </label>

                <label>
                  패들렛 원본 링크 URL (선택)
                  <input
                    value={editing.padletUrl || ''}
                    onChange={e => setEditing({ ...editing, padletUrl: e.target.value })}
                    placeholder="https://padlet.com/..."
                  />
                </label>
              </div>

              {/* 실시간 미리보기 카드 */}
              <div className="preview-column">
                <span className="preview-label">
                  <Eye size={15} /> 실제 카드 미리보기
                </span>
                <div className="resource-card preview-card">
                  <div className="card-head">
                    <span className="card-icon">🌟</span>
                    <span className="category">{sectionName(editing.sectionId)}</span>
                  </div>
                  <h3>{editing.title || '자료 제목을 입력하세요'}</h3>
                  <p className="description">
                    {editing.description || '자료에 대한 상세 설명이 이곳에 표시됩니다.'}
                  </p>
                  <div className="card-footer">
                    <span className="open-link">
                      자료 열어보기 <ExternalLink size={15} />
                    </span>
                    {editing.padletUrl && <span className="padlet-link">패들렛</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="admin-button" onClick={() => setEditing(null)}>
                취소
              </button>
              <button className="admin-button primary" onClick={savePost}>
                <Save size={16} /> 저장 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모달 2: 섹션 추가/수정 모달 */}
      {sectionEditing && (
        <div
          className="modal-overlay"
          role="presentation"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setSectionEditing(null);
          }}
        >
          <div className="admin-modal small" role="dialog" aria-modal="true" aria-label="섹션 편집">
            <div className="modal-heading">
              <h2>
                {data.sections.some(s => s.id === sectionEditing.id)
                  ? '📁 분류(섹션) 이름 수정'
                  : '✨ 새 분류(섹션) 추가'}
              </h2>
              <button onClick={() => setSectionEditing(null)} aria-label="닫기">
                <X size={20} />
              </button>
            </div>
            <label>
              섹션 이름 *
              <input
                autoFocus
                value={sectionEditing.title}
                onChange={e => setSectionEditing({ ...sectionEditing, title: e.target.value })}
                placeholder="예: 6학년 실과, 인공지능 프로젝트 등"
              />
            </label>
            <div className="modal-actions">
              <button className="admin-button" onClick={() => setSectionEditing(null)}>
                취소
              </button>
              <button className="admin-button primary" onClick={saveSection}>
                <Save size={16} /> 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모달 3: 섹션 삭제 시 게시물 이동 또는 일괄 삭제 해결 모달 */}
      {deleteSectionTarget && (
        <div className="modal-overlay" role="presentation">
          <div className="admin-modal medium" role="dialog" aria-modal="true">
            <div className="modal-heading danger">
              <h2>⚠️ 섹션 삭제 확인</h2>
              <button onClick={() => setDeleteSectionTarget(null)} aria-label="닫기">
                <X size={20} />
              </button>
            </div>
            <p className="modal-desc">
              <strong>'{deleteSectionTarget.section.title}'</strong> 분류에{' '}
              <strong className="text-danger">{deleteSectionTarget.postCount}개</strong>의 학습 자료가 등록되어 있습니다.
              어떻게 처리하시겠습니까?
            </p>

            {data.sections.filter(s => s.id !== deleteSectionTarget.section.id).length > 0 && (
              <div className="resolution-option-box">
                <label>
                  1. 다른 분류로 모든 게시물을 이동하고 섹션만 삭제:
                  <select
                    value={targetMoveSectionId}
                    onChange={e => setTargetMoveSectionId(e.target.value)}
                  >
                    {data.sections
                      .filter(s => s.id !== deleteSectionTarget.section.id)
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  className="admin-button primary"
                  onClick={() => executeDeleteSectionWithAction('move')}
                >
                  게시물 이동 후 섹션 삭제
                </button>
              </div>
            )}

            <div className="resolution-option-box danger-box">
              <p>2. 이 분류에 포함된 자료 {deleteSectionTarget.postCount}개를 모두 함께 영구 삭제:</p>
              <button
                className="admin-button danger"
                onClick={() => executeDeleteSectionWithAction('cascade')}
              >
                게시물과 섹션 모두 삭제
              </button>
            </div>

            <div className="modal-actions">
              <button className="admin-button" onClick={() => setDeleteSectionTarget(null)}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
