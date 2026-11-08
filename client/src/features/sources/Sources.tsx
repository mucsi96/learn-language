import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Menu, MenuItem, MenuPopover, MenuTrigger, Switch } from '@mucsi96/react-ui';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { apiQuery, sendJson } from '../../api/http';
import { namedSchema, sourceSchema, stateSchema } from '../../api/schemas';
import type { Source } from '../../api/schemas';
import { useAction } from '../../api/mutations';
import { QueryState } from '../../components/QueryState';
import { StateBadge } from '../../components/StateBadge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { SourceDialog } from './SourceDialog';
import styles from '../../components/Forms.module.css';
import sourceStyles from './Sources.module.css';

const attention = (source: Source) =>
  [
    { label: 'flagged', count: source.flaggedCardCount, filter: 'flagged' },
    { label: 'draft', count: source.draftCardCount, filter: 'draft' },
    { label: 'suggested known', count: source.suggestedKnownCardCount, filter: 'suggestedKnown' },
    { label: 'unhealthy', count: source.unhealthyCardCount, filter: 'unhealthy' },
    { label: 'to triage', count: source.pendingWordImportCount, filter: 'wordImport' },
  ].filter((item) => item.count > 0);

export default function Sources() {
  const query = useQuery(apiQuery('/api/sources', z.array(sourceSchema)));
  const groups = useQuery(apiQuery('/api/source-groups', z.array(namedSchema)));
  const navigate = useNavigate();
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [editing, setEditing] = useState<Source | 'new'>();
  const [deleting, setDeleting] = useState<Source>();
  const remove = useAction(
    (source: Source) => sendJson(`/api/source/${source.id}`, 'DELETE'),
    () => setDeleting(undefined)
  );
  return (
    <>
      <h1>Sources</h1>
      <div className={styles.toolbar}>
        <Button onPress={() => setEditing('new')}>Add Source</Button>
        <Switch isSelected={attentionOnly} onChange={setAttentionOnly}>
          Needs attention only
        </Switch>
      </div>
      <QueryState query={query} label="Loading sources">
        {(sources) => (
          <QueryState query={groups} label="Loading groups">
            {(groupList) => {
              const visible = sources.filter((source) => !attentionOnly || attention(source).length > 0);
              return (
                <>
                  {visible.length === 0 &&
                    (attentionOnly ? (
                      <p>No sources need attention.</p>
                    ) : (
                      <section>
                        <h2>No sources yet</h2>
                        <p>Create your first source to start adding cards.</p>
                      </section>
                    ))}
                  {[...groupList, { id: null, name: 'Ungrouped' }].map((group) => {
                    const members = visible.filter((source) => source.groupId === group.id);
                    return (
                      members.length > 0 && (
                        <section key={group.id ?? 'ungrouped'} aria-label={`${group.name} sources`}>
                          {(group.id !== null || groupList.length > 0) && <h2>{group.name}</h2>}
                          <div className={styles.scroll}>
                            <table
                              className={`${styles.table} ${sourceStyles.table}`}
                              aria-label={`${group.name} sources`}
                            >
                              <thead>
                                <tr>
                                  {['Name', 'Level', 'Cards', 'States', 'Readiness', 'Needs attention', 'Actions'].map(
                                    (label) => (
                                      <th key={label}>{label}</th>
                                    )
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {members.map((source) => (
                                  <tr key={source.id} aria-label={source.name}>
                                    <th scope="row">{source.name}</th>
                                    <td>{source.languageLevel}</td>
                                    <td>{source.cardCount}</td>
                                    <td>
                                      {Object.entries(source.stateCounts).map(([state, count]) => (
                                        <StateBadge key={state} state={stateSchema.parse(state)} count={count} />
                                      ))}
                                    </td>
                                    <td>
                                      {Object.entries(source.readinessCounts).map(([readiness, count]) => (
                                        <Badge key={readiness} aria-label={`${readiness}: ${count}`}>
                                          {readiness === 'IN_REVIEW'
                                            ? 'In Review'
                                            : readiness[0] + readiness.slice(1).toLowerCase()}{' '}
                                          {count}
                                        </Badge>
                                      ))}
                                    </td>
                                    <td>
                                      {attention(source).length === 0
                                        ? 'All clear'
                                        : attention(source).map((item) => (
                                            <Link
                                              key={item.filter}
                                              to={
                                                item.filter === 'wordImport'
                                                  ? `/sources/${source.id}/word-import`
                                                  : `/sources/${source.id}/cards?filter=${item.filter}`
                                              }
                                              aria-label={`${source.name}: ${item.count} ${item.label} cards`}
                                            >
                                              {item.count} {item.label}{' '}
                                            </Link>
                                          ))}
                                    </td>
                                    <td>
                                      <MenuTrigger>
                                        <Button variant="icon" aria-label={`Actions for ${source.name}`}>
                                          ⋮
                                        </Button>
                                        <MenuPopover>
                                          <Menu aria-label={`Actions for ${source.name}`}>
                                            {source.sourceType === 'audioCollection' ? (
                                              <MenuItem
                                                onAction={() => {
                                                  void navigate(`/sources/${source.id}/content`);
                                                }}
                                              >
                                                Stories
                                              </MenuItem>
                                            ) : (
                                              !['wordTriage', 'ebookDictionary'].includes(source.sourceType) && (
                                                <MenuItem
                                                  onAction={() => {
                                                    void navigate(
                                                      source.sourceType === 'json'
                                                        ? `/sources/${source.id}/json`
                                                        : `/sources/${source.id}/page/${source.startPage}`
                                                    );
                                                  }}
                                                >
                                                  Pages
                                                </MenuItem>
                                              )
                                            )}
                                            {source.sourceType === 'wordTriage' && (
                                              <MenuItem
                                                onAction={() => {
                                                  void navigate(`/sources/${source.id}/word-import`);
                                                }}
                                              >
                                                Import Words
                                              </MenuItem>
                                            )}
                                            <MenuItem
                                              onAction={() => {
                                                void navigate(`/sources/${source.id}/cards`);
                                              }}
                                            >
                                              Cards
                                            </MenuItem>
                                            <MenuItem onAction={() => setEditing(source)}>Edit</MenuItem>
                                            <MenuItem tone="error" onAction={() => setDeleting(source)}>
                                              Delete
                                            </MenuItem>
                                          </Menu>
                                        </MenuPopover>
                                      </MenuTrigger>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      )
                    );
                  })}
                </>
              );
            }}
          </QueryState>
        )}
      </QueryState>
      {editing && (
        <SourceDialog source={editing === 'new' ? undefined : editing} onClose={() => setEditing(undefined)} />
      )}
      {deleting && (
        <ConfirmDialog
          message={`Are you sure you want to delete "${deleting.name}"? All associated cards will also be deleted. This action cannot be undone.`}
          onClose={() => setDeleting(undefined)}
          onConfirm={() => remove.mutate(deleting)}
          pending={remove.isPending}
        />
      )}
    </>
  );
}
