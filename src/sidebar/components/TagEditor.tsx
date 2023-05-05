import { useElementShouldClose } from '@hypothesis/frontend-shared';
import { Input } from '@hypothesis/frontend-shared/lib/next';
import { useEffect, useCallback, useRef, useState } from 'preact/hooks';

import { withServices } from '../service-context';
import type { TagsService } from '../services/tags';
import type { APIService } from '../services/api';
import AutocompleteList from './AutocompleteList';
import TagList from './TagList';
import TagListItem from './TagListItem';
import cases from '../services/tosdr-cases';
import { useSidebarStore } from '../store';
import { username } from '../helpers/account-id';

// Global counter used to create a unique id for each instance of a TagEditor
let tagEditorIdCounter = 0;

/**
 * Lookup cookie for tosdr auth
 *
 * @param {string} name - name of cookie
 */
const getCookie = (name) => {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=')
    return parts[0] === name ? decodeURIComponent(parts[1]) : r
  }, '')
}

export type TagEditorProps = {
  onAddTag: (tag: string) => boolean;
  onRemoveTag: (tag: string) => boolean;
  onTagInput: (tag: string) => void;
  tagList: string[];

  // injected
  tags: TagsService;
  api: APIService;
};
/**
 * Component to edit annotation's tags.
 *
 * Component accessibility is modeled after "Combobox with Listbox Autocomplete Example" found here:
 * https://www.w3.org/WAI/ARIA/apg/example-index/combobox/combobox-autocomplete-list.html
 */
function TagEditor({
  onAddTag,
  onRemoveTag,
  onTagInput,
  tagList,
  tags: tagsService,
  api,
}: TagEditorProps) {
  const inputEl = useRef<HTMLInputElement>();
  const [suggestionsFullList, setSuggestionsFullList] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  // const [suggestions, setSuggestions] = useState([] as string[]);
  const [activeItem, setActiveItem] = useState(-1); // -1 is unselected
  const [suggestionsListOpen, setSuggestionsListOpen] = useState(false);
  const [tagEditorId] = useState(() => {
    ++tagEditorIdCounter;
    return `TagEditor-${tagEditorIdCounter}`;
  });

  const fetchCases = useCallback(async () => {
    const params = {};
    api.tosdr.cases(params).then(resp => {
      const list = resp.map(r => r.title);
      setSuggestions(list)
      setSuggestionsFullList(list)
    }).catch(err => {
      throw new Error(`Error! Check ToS;DR logs: ${err}`);
    })
  }, [api, setSuggestions])

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // Set up callback to monitor outside click events to close the AutocompleteList
  const closeWrapperRef = useRef<HTMLDivElement>(null);
  useElementShouldClose(closeWrapperRef, suggestionsListOpen, () => {
    setSuggestionsListOpen(false);
  });

  /**
   * Retrieve the current trimmed text value of the tag <input>
   */
  const pendingTag = () => inputEl.current!.value.trim();
  const hasPendingTag = () => pendingTag() && pendingTag().length > 0;
  const clearPendingTag = () => {
    inputEl.current!.value = '';
    onTagInput?.('');
  };

  /**
   * Helper function that returns a list of suggestions less any
   * results also found from the duplicates list.
   */
  const removeDuplicates = (suggestions: string[], duplicates: string[]) => {
    const suggestionsSet = [];
    for (const suggestion of suggestions) {
      if (duplicates.indexOf(suggestion) < 0) {
        suggestionsSet.push(suggestion);
      }
    }
    return suggestionsSet.sort();
  };

  /**
   * Get a list of suggestions returned from the tagsService
   * reset the activeItem and open the AutocompleteList
   */
  const updateSuggestions = () => {
    const suggestionsNew = tagsService.filter(suggestionsFullList, pendingTag());
    // Remove any repeated suggestions that are already tags
    // and set those to state.
    setSuggestions(removeDuplicates(suggestionsNew, tagList));
    setSuggestionsListOpen(suggestionsNew.length > 0);
    setActiveItem(-1);
  };

  /**
   * Invokes callback to add tag. If the tag was added, close the suggestions
   * list, clear the field content and maintain focus.
   */
  const addTag = (newTag: string) => {
    if (onAddTag(newTag)) {
      setSuggestionsListOpen(false);
      setActiveItem(-1);

      clearPendingTag();
      inputEl.current!.focus();
    }
  };

  const handleOnInput = () => {
    onTagInput?.(pendingTag());
    updateSuggestions();
  };

  /**
   *  Callback when the user clicked one of the items in the suggestions list.
   *  This will add a new tag.
   */
  const handleSelect = (item: string) => {
    if (item) {
      addTag(item);
    }
  };

  /**
   * Opens the AutocompleteList on focus if there is a value in the input
   */
  const handleFocus = () => {
    // if (!pendingTag().length) {
    //   setSuggestions(cases);
    // }
    setSuggestionsListOpen(true);
  };

  /**
   *  Called when the user uses keyboard navigation to move
   *  up or down the suggestions list creating a highlighted
   *  item.
   *
   *  The first value in the list is an unselected value (-1).
   *  A user can arrive at this value by pressing the up arrow back to
   *  the beginning or the down arrow until the end.
   *
   * @param {number} direction - Pass 1 for the next item or -1 for the previous
   */
  const changeSelectedItem = (direction: -1 | 1) => {
    let nextActiveItem = activeItem + direction;
    if (nextActiveItem < -1) {
      nextActiveItem = suggestions.length - 1;
    } else if (nextActiveItem >= suggestions.length) {
      nextActiveItem = -1;
    }
    setActiveItem(nextActiveItem);
  };

  /**
   * Keydown handler for keyboard navigation of the tag editor field and the
   * suggested-tags list.
   */
  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        // Select the previous item in the suggestion list
        changeSelectedItem(-1);
        e.preventDefault();
        break;
      case 'ArrowDown':
        // Select the next item in the suggestion list
        changeSelectedItem(1);
        e.preventDefault();
        break;
      case 'Escape':
        // Clear any entered text, but retain focus
        clearPendingTag();
        e.preventDefault();
        break;
      case 'Enter':
        if (activeItem === -1) {
          e.preventDefault();
          break;
        }
        addTag(suggestions[activeItem]);
        break;
      case 'Tab':
        // Commit a tag, or tab out of the field if it is empty (default browser
        // behavior)
        if (!hasPendingTag()) {
          // If the tag field is empty, allow `Tab` to have its default
          // behavior: continue to the next element in tab order
          break;
        }
        if (activeItem !== -1) {
          // If there is a selected item in the suggested tag list,
          // commit that tag (just like `Enter` and `,` in this case)
          addTag(suggestions[activeItem]);
        } else if (suggestions.length === 1) {
          // If there is exactly one suggested tag match, commit that tag
          // This emulates a "tab-complete" behavior
          addTag(suggestions[0]);
        }
        // Retain focus
        e.preventDefault();
        break;
    }
  };

  /**
   * Callback for formatting a suggested tag item. Use selective bolding
   * to help delineate which part of the entered tag text matches the
   * suggestion.
   */
  const formatSuggestedItem = (item: string) => {
    // filtering of tags is case-insensitive
    const curVal = pendingTag().toLowerCase();
    const suggestedTag = item.toLowerCase();
    const matchIndex = suggestedTag.indexOf(curVal);

    // If the current input doesn't seem to match the suggested tag,
    // just render the tag as-is.
    if (matchIndex === -1) {
      return <span>{item}</span>;
    }

    // Break the suggested tag into three parts:
    // 1. Substring of the suggested tag that occurs before the match
    //    with the current input
    const prefix = item.slice(0, matchIndex);
    // 2. Substring of the suggested tag that matches the input text. NB:
    //    This may be in a different case than the input text.
    const matchString = item.slice(matchIndex, matchIndex + curVal.length);
    // 3. Substring of the suggested tag that occurs after the matched input
    const suffix = item.slice(matchIndex + curVal.length);

    return (
      <span>
        <strong>{prefix}</strong>
        {matchString}
        <strong>{suffix}</strong>
      </span>
    );
  };

  // The activedescendant prop should match the activeItem's value except
  // when its -1 (no item selected), and in this case set the activeDescendant to "".
  const activeDescendant =
    activeItem >= 0 ? `${tagEditorId}-AutocompleteList-item-${activeItem}` : '';
 
  return (
    <div className="space-y-4">
      <TagList>
        {tagList.map(tag => {
          return <TagListItem key={tag} onRemoveTag={onRemoveTag} tag={tag} />;
        })}
      </TagList>
      {!tagList.length && (
          <div
            id={tagEditorId}
            data-testid="combobox-container"
            ref={closeWrapperRef}
          >
            <Input
              onInput={handleOnInput}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              elementRef={inputEl}
              placeholder="Add case"
              type="text"
              autoComplete="off"
              aria-autocomplete="list"
              aria-activedescendant={activeDescendant}
              aria-controls={`${tagEditorId}-AutocompleteList`}
              aria-expanded={suggestionsListOpen}
              aria-label="Add tags"
              dir="auto"
              role="combobox"
            />
            <AutocompleteList
              id={`${tagEditorId}-AutocompleteList`}
              list={suggestions}
              listFormatter={formatSuggestedItem}
              open={suggestionsListOpen}
              onSelectItem={handleSelect}
              itemPrefixId={`${tagEditorId}-AutocompleteList-item-`}
              activeItem={activeItem}
            />
          </div>
      )} 
    </div>
  );
}

export default withServices(TagEditor, ['tags', 'api']);
