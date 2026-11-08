import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Checkbox, Dialog, Select, TextField } from '@mucsi96/react-ui';
import { z } from 'zod';
import { apiQuery, request, sendJson } from '../../api/http';
import { environmentSchema, namedSchema, partnerSchema } from '../../api/schemas';
import type { Source } from '../../api/schemas';
import { useAction } from '../../api/mutations';
import { QueryState } from '../../components/QueryState';
import styles from '../../components/Forms.module.css';
import dialogStyles from './SourceDialog.module.css';

const cardTypes = [
  { id: 'vocabulary', label: 'Vocabulary' },
  { id: 'speech', label: 'Speech' },
  { id: 'grammar', label: 'Grammar' },
  { id: 'simple', label: 'Simple' },
];
const slugify = (name: string) =>
  name
    .normalize('NFKD')
    .replace(/ß/g, 'ss')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/g, '');

export function SourceDialog({ source, onClose }: { source?: Source; onClose: () => void }) {
  const environment = useQuery(apiQuery('/api/environment', environmentSchema));
  const partners = useQuery(apiQuery('/api/learning-partners', z.array(partnerSchema)));
  const groups = useQuery(apiQuery('/api/source-groups', z.array(namedSchema)));
  const [name, setName] = useState(source?.name ?? '');
  const [sourceType, setSourceType] = useState(source?.sourceType ?? '');
  const [types, setTypes] = useState<string[]>(source?.cardTypes ?? []);
  const [languageLevel, setLanguageLevel] = useState(source?.languageLevel ?? '');
  const [formatType, setFormatType] = useState(source?.formatType ?? '');
  const [collectionPath, setCollectionPath] = useState(source?.collectionPath ?? '');
  const [startPage, setStartPage] = useState(String(source?.startPage ?? 1));
  const [cardLimit, setCardLimit] = useState(String(source?.cardLimit ?? 50));
  const [newCardLimit, setNewCardLimit] = useState(String(source?.newCardLimit ?? 50));
  const [typingPractice, setTypingPractice] = useState(source?.typingPractice ?? false);
  const [aiLanguage, setAiLanguage] = useState<string>(source?.aiLanguage ?? 'hungarian');
  const [partnerId, setPartnerId] = useState(String(source?.learningPartnerId ?? ''));
  const [groupId, setGroupId] = useState(source?.groupId ?? '');
  const [file, setFile] = useState<File>();
  const forcedType =
    sourceType === 'json'
      ? 'simple'
      : ['wordTriage', 'audioCollection'].includes(sourceType)
        ? 'vocabulary'
        : undefined;
  const selectedTypes = forcedType ? [forcedType] : types;
  const needsFormat = selectedTypes.includes('vocabulary') && !['wordTriage', 'audioCollection'].includes(sourceType);
  const valid =
    name.trim() &&
    languageLevel &&
    sourceType &&
    selectedTypes.length > 0 &&
    (!needsFormat || formatType) &&
    Number(startPage) >= 1 &&
    Number(cardLimit) >= 1 &&
    Number(newCardLimit) >= 1 &&
    (sourceType !== 'audioCollection' || /^(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)+$/.test(collectionPath)) &&
    (source || !['pdf', 'ebookDictionary'].includes(sourceType) || file?.name.toLowerCase().endsWith('.pdf'));
  const save = useAction(async () => {
    const upload = async () => {
      if (!file) return undefined;
      const body = new FormData();
      body.set('file', file);
      const response = await request('/api/source/upload', { method: 'POST', body });
      return z.object({ fileName: z.string() }).parse(await response.json()).fileName;
    };
    await sendJson(source ? `/api/source/${source.id}` : '/api/source', source ? 'PUT' : 'POST', {
      id: source?.id ?? slugify(name),
      name,
      sourceType,
      collectionPath: sourceType === 'audioCollection' ? collectionPath : undefined,
      fileName: await upload(),
      startPage: Number(startPage),
      languageLevel,
      cardTypes: selectedTypes,
      formatType:
        sourceType === 'audioCollection'
          ? 'flowingText'
          : sourceType === 'wordTriage'
            ? undefined
            : needsFormat
              ? formatType
              : selectedTypes.some((type) => ['speech', 'grammar'].includes(type))
                ? 'flowingText'
                : undefined,
      cardLimit: Number(cardLimit),
      newCardLimit: Number(newCardLimit),
      typingPractice: sourceType === 'json' && typingPractice,
      aiLanguage,
      learningPartnerId: partnerId ? Number(partnerId) : source ? 0 : null,
      groupId: groupId || (source ? '' : null),
    });
  }, onClose);
  return (
    <Dialog
      title={source ? 'Edit Source' : 'Add New Source'}
      isOpen
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
      className={styles.dialog}
    >
      <QueryState query={environment} label="Loading source options">
        {(config) => (
          <QueryState query={partners} label="Loading learning partners">
            {(partnerList) => (
              <QueryState query={groups} label="Loading source groups">
                {(groupList) => (
                  <form
                    className={styles.form}
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (valid) save.mutate();
                    }}
                  >
                    <h3>General</h3>
                    <TextField label="Name" value={name} onChange={setName} isRequired />
                    <h3>Classification</h3>
                    <div className={styles.grid}>
                      <fieldset className={dialogStyles.cardTypes}>
                        <legend>Card Types</legend>
                        {cardTypes
                          .filter((type) => !forcedType || forcedType === type.id)
                          .map((type) => (
                            <Checkbox
                              key={type.id}
                              isSelected={selectedTypes.includes(type.id)}
                              isDisabled={!!forcedType}
                              onChange={(checked) =>
                                setTypes((previous) =>
                                  checked ? [...previous, type.id] : previous.filter((id) => id !== type.id)
                                )
                              }
                            >
                              {type.label}
                            </Checkbox>
                          ))}
                      </fieldset>
                      <Select
                        label="Language Level"
                        selectedKey={languageLevel}
                        onSelectionChange={(key) => setLanguageLevel(String(key))}
                        options={config.languageLevels.map((level) => ({ id: level.code, label: level.displayName }))}
                        isRequired
                      />
                      <Select
                        label="Source Type"
                        selectedKey={sourceType}
                        onSelectionChange={(key) => setSourceType(String(key) as typeof sourceType)}
                        options={config.sourceTypes.map((type) => ({ id: type.code, label: type.displayName }))}
                        isDisabled={!!source}
                        isRequired
                      />
                      {sourceType === 'audioCollection' && (
                        <TextField
                          label="Collection folder"
                          value={collectionPath}
                          onChange={setCollectionPath}
                          isDisabled={!!source}
                          description="Folder in ibari/learn-language, ending with /"
                          isRequired
                        />
                      )}
                      {needsFormat && (
                        <Select
                          label="Format Type"
                          selectedKey={formatType}
                          onSelectionChange={(key) => setFormatType(String(key))}
                          options={config.sourceFormatTypes.map((type) => ({ id: type.code, label: type.displayName }))}
                          isRequired
                        />
                      )}
                    </div>
                    <h3>Content</h3>
                    {['pdf', 'ebookDictionary'].includes(sourceType) && (
                      <>
                        <div
                          className={styles.drop}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.preventDefault();
                            setFile(event.dataTransfer.files[0]);
                          }}
                        >
                          <label>
                            Upload PDF file
                            <input type="file" accept=".pdf" onChange={(event) => setFile(event.target.files?.[0])} />
                          </label>
                          {file && (
                            <p>
                              {file.name}
                              <Button variant="text" aria-label="Remove file" onPress={() => setFile(undefined)}>
                                Remove
                              </Button>
                            </p>
                          )}
                        </div>
                        <TextField label="Start Page" type="number" value={startPage} onChange={setStartPage} />
                      </>
                    )}
                    {sourceType === 'images' && <p>Images will be added from the page view</p>}
                    {sourceType === 'json' && (
                      <p>Cards are added by importing a JSON array after creating the source.</p>
                    )}
                    {sourceType === 'wordTriage' && (
                      <p>Cards are added by importing a word list JSON after creating the source.</p>
                    )}
                    {sourceType === 'audioCollection' && (
                      <p>
                        Each numbered story folder contains audio.mp3 and text.txt. Vocabulary is prepared when you open
                        a story.
                      </p>
                    )}
                    <h3>Study Settings</h3>
                    <div className={styles.grid}>
                      <TextField label="Card Limit" type="number" value={cardLimit} onChange={setCardLimit} />
                      <TextField label="New Card Limit" type="number" value={newCardLimit} onChange={setNewCardLimit} />
                      <Select
                        label="Learning Partner"
                        selectedKey={partnerId}
                        onSelectionChange={(key) => setPartnerId(String(key))}
                        options={[
                          { id: '', label: 'None' },
                          ...partnerList.map((partner) => ({ id: String(partner.id), label: partner.name })),
                        ]}
                      />
                      <Select
                        label="Group"
                        selectedKey={groupId}
                        onSelectionChange={(key) => setGroupId(String(key))}
                        options={[
                          { id: '', label: 'None' },
                          ...groupList.map((group) => ({ id: group.id, label: group.name })),
                        ]}
                      />
                      <Select
                        label="AI Interaction Language"
                        selectedKey={aiLanguage}
                        onSelectionChange={(key) => setAiLanguage(String(key))}
                        options={[
                          { id: 'hungarian', label: 'Hungarian' },
                          { id: 'english', label: 'English' },
                        ]}
                      />
                    </div>
                    {sourceType === 'json' && (
                      <Checkbox isSelected={typingPractice} onChange={setTypingPractice}>
                        Practice typing the answer
                      </Checkbox>
                    )}
                    <div className={styles.actions}>
                      <Button variant="text" onPress={onClose} isDisabled={save.isPending}>
                        Cancel
                      </Button>
                      <Button type="submit" isDisabled={!valid || save.isPending}>
                        {source ? 'Update' : 'Create'}
                      </Button>
                    </div>
                  </form>
                )}
              </QueryState>
            )}
          </QueryState>
        )}
      </QueryState>
    </Dialog>
  );
}
