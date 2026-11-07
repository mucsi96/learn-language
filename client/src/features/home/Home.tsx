import { useQuery } from '@tanstack/react-query';
import { Card, LinkButton } from '@mucsi96/react-ui';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { apiQuery } from '../../api/http';
import { sourceSchema, namedSchema, dueCountSchema } from '../../api/schemas';
import { QueryState } from '../../components/QueryState';
import { StateBadge } from '../../components/StateBadge';
import styles from './Home.module.css';

export default function Home() {
  const sources = useQuery(apiQuery('/api/sources', z.array(sourceSchema)));
  const groups = useQuery(apiQuery('/api/source-groups', z.array(namedSchema)));
  const due = useQuery(apiQuery('/api/sources/due-cards-count', z.array(dueCountSchema)));
  return (
    <QueryState query={sources} label="Loading study overview">
      {(sourceList) => (
        <QueryState query={groups} label="Loading source groups">
          {(groupList) => (
            <QueryState query={due} label="Loading due counts">
              {(counts) => (
                <>
                  <h1>Welcome to Learn Language</h1>
                  <p>Select a source to start learning:</p>
                  {sourceList.length === 0 && (
                    <p>
                      No sources yet. <Link to="/sources">Add a source</Link> to start learning.
                    </p>
                  )}
                  {[...groupList, { id: null, name: 'Ungrouped' }].map((group) => {
                    const members = sourceList.filter((source) => source.groupId === group.id);
                    return (
                      members.length > 0 && (
                        <section key={group.id ?? 'ungrouped'} aria-label={`${group.name} sources`}>
                          {(group.id !== null || groupList.length > 0) && <h2>{group.name}</h2>}
                          <div className={styles.sources}>
                            {members.map((source) => {
                              const sourceCounts = counts.filter((count) => count.sourceId === source.id);
                              const hasDue = sourceCounts.some((count) => count.count > 0);
                              return (
                                <Card key={source.id} role="group" aria-label={source.name} className={styles.source}>
                                  <Link
                                    to={`/sources/${source.id}/study`}
                                    aria-disabled={!hasDue}
                                    tabIndex={hasDue ? 0 : -1}
                                    onClick={(event) => {
                                      if (!hasDue) event.preventDefault();
                                    }}
                                    className={styles.link}
                                  >
                                    <h2>
                                      {source.name}{' '}
                                      {sourceCounts.map((count) => (
                                        <StateBadge key={count.state} state={count.state} count={count.count} />
                                      ))}
                                    </h2>
                                  </Link>
                                  {source.sourceType === 'audioCollection' && (
                                    <LinkButton
                                      href={`/sources/${source.id}/listen`}
                                      variant="text"
                                      aria-label={`Listen to ${source.name}`}
                                    >
                                      Listen
                                    </LinkButton>
                                  )}
                                </Card>
                              );
                            })}
                          </div>
                        </section>
                      )
                    );
                  })}
                </>
              )}
            </QueryState>
          )}
        </QueryState>
      )}
    </QueryState>
  );
}
