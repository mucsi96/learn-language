import { NavLink, Outlet } from 'react-router-dom';
import styles from './Settings.module.css';

const sections = [
  ['voices', 'Voices'],
  ['data-models', 'Data Models'],
  ['image-models', 'Image Models'],
  ['known-words', 'Known Words'],
  ['learning-partners', 'Learning Partners'],
  ['source-groups', 'Source Groups'],
  ['grammar-topics', 'Grammar Topics'],
  ['api-tokens', 'API Tokens'],
  ['daily-sessions', 'Daily Sessions'],
];
export default function Settings() {
  return (
    <div className={styles.layout}>
      <nav aria-label="Settings navigation" className={styles.navigation}>
        {sections.map(([path, label]) => (
          <NavLink key={path} to={`/settings/${path}`}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
