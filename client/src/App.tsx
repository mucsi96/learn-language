import { lazy, Suspense } from 'react';
import {
  AppHeader,
  AppHeaderActions,
  AppMain,
  BarLoader,
} from '@mucsi96/react-ui';
import { Link, Navigate, Route, Routes, useMatch, useNavigate } from 'react-router-dom';
import { RouterProvider } from 'react-aria-components';
import { ProfileMenu } from './components/ProfileMenu';
import styles from './App.module.css';
import { RouteTitle } from './components/RouteTitle';
import { ProviderBillingAlert } from './features/creation/ProviderBillingAlert';
import { SourceNavigation } from './features/sources/SourceNavigation';

const Home = lazy(() => import('./features/home/Home'));
const Sources = lazy(() => import('./features/sources/Sources'));
const Settings = lazy(() => import('./features/settings/Settings'));
const NamedList = lazy(() => import('./features/settings/NamedList'));
const KnownWords = lazy(() => import('./features/settings/KnownWords'));
const ApiTokens = lazy(() => import('./features/settings/ApiTokens'));
const DailySessions = lazy(() => import('./features/settings/DailySessions'));
const Study = lazy(() => import('./features/study/Study'));
const Models = lazy(() => import('./features/settings/Models'));
const Voices = lazy(() => import('./features/settings/Voices'));
const Cards = lazy(() => import('./features/cards/Cards'));
const InReviewCards = lazy(() => import('./features/review/InReviewCards'));
const ModelUsage = lazy(() => import('./features/usage/ModelUsage'));
const WordImport = lazy(() =>
  import('./features/triage/WordImportPage').then((module) => ({ default: module.WordImportPage }))
);
const Content = lazy(() =>
  import('./features/content/ContentPage').then((module) => ({ default: module.ContentPage }))
);
const Listening = lazy(() =>
  import('./features/content/ContentPage').then((module) => ({ default: module.ListeningPage }))
);
const PageViewer = lazy(() => import('./features/creation').then((module) => ({ default: module.PageViewer })));
const JsonPage = lazy(() => import('./features/creation').then((module) => ({ default: module.JsonPage })));
const CardEditorPage = lazy(() => import('./features/creation').then((module) => ({ default: module.CardEditorPage })));

export function App() {
  const navigate = useNavigate();
  const studyRoute = useMatch('/sources/:sourceId/study');
  return (
    <RouterProvider navigate={navigate}>
      <RouteTitle />
      <div className={`${styles.layout} ${studyRoute ? styles.studyLayout : ''}`}>
        <AppHeader className={styles.header}>
          <Link to="/" className={styles.brand}>
            Learn Language
          </Link>
          <AppHeaderActions>
            <SourceNavigation />
            <div id="study-header-controls" className={styles.studyControls} />
            {!studyRoute && <ProfileMenu />}
          </AppHeaderActions>
        </AppHeader>
        <AppMain className={styles.main}>
          <ProviderBillingAlert />
          <Suspense fallback={<BarLoader label="Opening page" />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/sources" element={<Sources />} />
              <Route path="/sources/:sourceId/study" element={<Study />} />
              <Route path="/sources/:sourceId/cards" element={<Cards />} />
              <Route path="/in-review-cards" element={<InReviewCards />} />
              <Route path="/model-usage" element={<ModelUsage />} />
              <Route path="/sources/:sourceId/word-import" element={<WordImport />} />
              <Route path="/sources/:sourceId/content/:contentId?" element={<Content />} />
              <Route path="/sources/:sourceId/listen/:contentId?" element={<Listening />} />
              <Route path="/sources/:sourceId/page/:pageNumber" element={<PageViewer />} />
              <Route path="/sources/:sourceId/json" element={<JsonPage />} />
              <Route path="/sources/:sourceId/page/:pageNumber/cards/:cardId" element={<CardEditorPage />} />
              <Route
                path="*"
                element={
                  <section>
                    <h1>Page not found</h1>
                    <Link to="/">Back to home</Link>
                  </section>
                }
              />
              <Route path="/settings" element={<Settings />}>
                <Route index element={<Navigate to="voices" replace />} />
                <Route path="voices" element={<Voices />} />
                <Route path="data-models" element={<Models kind="data" />} />
                <Route path="image-models" element={<Models kind="image" />} />
                <Route path="source-groups" element={<NamedList key="source-groups" kind="source-groups" />} />
                <Route
                  path="learning-partners"
                  element={<NamedList key="learning-partners" kind="learning-partners" />}
                />
                <Route path="grammar-topics" element={<NamedList key="grammar-topics" kind="grammar-topics" />} />
                <Route path="known-words" element={<KnownWords />} />
                <Route path="api-tokens" element={<ApiTokens />} />
                <Route path="daily-sessions" element={<DailySessions />} />
              </Route>
            </Routes>
          </Suspense>
        </AppMain>
      </div>
    </RouterProvider>
  );
}
