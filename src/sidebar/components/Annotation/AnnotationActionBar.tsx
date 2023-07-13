import {
  IconButton,
  EditIcon,
  FlagIcon,
  FlagFilledIcon,
  Link,
  ReplyIcon,
  TrashIcon,
  ShareIcon,
} from '@hypothesis/frontend-shared/lib/next';
import { useMemo, useState, useEffect, useCallback } from 'preact/hooks';


import { confirm } from '../../../shared/prompts';
import type { SavedAnnotation } from '../../../types/api';
import type { SidebarSettings } from '../../../types/config';
import { serviceConfig } from '../../config/service-config';
import { annotationRole } from '../../helpers/annotation-metadata';
import {
  sharingEnabled,
  annotationSharingLink,
} from '../../helpers/annotation-sharing';
import { isPrivate, permits } from '../../helpers/permissions';
import { withServices } from '../../service-context';
import type { AnnotationsService } from '../../services/annotations';
import type { APIService } from '../../services/api';
import type { ToastMessengerService } from '../../services/toast-messenger';
import { useSidebarStore } from '../../store';
import AnnotationShareControl from './AnnotationShareControl';

function flaggingEnabled(settings: SidebarSettings) {
  const service = serviceConfig(settings);
  if (service?.allowFlagging === false) {
    return false;
  }
  return true;
}

export type AnnotationActionBarProps = {
  annotation: SavedAnnotation;
  onReply: () => void;

  // injected
  annotationsService: AnnotationsService;
  settings: SidebarSettings;
  toastMessenger: ToastMessengerService;
  api: APIService;
};

/**
 * A collection of buttons in the footer area of an annotation that take
 * actions on the annotation.
 *
 * @param {AnnotationActionBarProps} props
 */
function AnnotationActionBar({
  annotation,
  annotationsService,
  onReply,
  settings,
  toastMessenger,
  api,
}: AnnotationActionBarProps) {
  const store = useSidebarStore();
  const userProfile = store.profile();
  const isLoggedIn = store.isLoggedIn();
  // Is the current user allowed to take the given `action` on this annotation?
  const userIsAuthorizedTo = (action: 'update' | 'delete') => {
    return permits(annotation.permissions, action, userProfile.userid);
  };

  const showDeleteAction = userIsAuthorizedTo('delete');
  const showEditAction = userIsAuthorizedTo('update');

  //  Only authenticated users can flag an annotation, except the annotation's author.
  const showFlagAction =
    flaggingEnabled(settings) &&
    !!userProfile.userid &&
    userProfile.userid !== annotation.user;

  // const shareLink =
  //   sharingEnabled(settings) && annotationSharingLink(annotation);

  const onDelete = async () => {
    const annType = annotationRole(annotation);
    if (
      await confirm({
        title: `Remove ${annType.toLowerCase()}?`,
        message: `Are you sure you want to remove this ${annType.toLowerCase()}? The point will still exist in the database, but it will be marked as 'declined', so it will no longer show up in this document as an annotation.`,
        confirmAction: 'Remove',
      })
    ) {
      try {
        await annotationsService.delete(annotation);
        toastMessenger.success(`${annType} removed`, { visuallyHidden: true });
      } catch (err) {
        toastMessenger.error(err.message);
      }
    }
  };

  const [pointLinks, setPointLinks] = useState({})
  const fetchPointLinks = useCallback(async () => {
    api.tosdr.fetchPoint({ id: annotation.id }).then(resp => {
      const point = resp?.id.toString()
      let base = store.getLink('tosdr')
      base = base ? base + '/points' : '/points'
      pointLinks[annotation.id] = base + '/' + point
      setPointLinks(pointLinks)
    }).catch(err => {
      throw new Error(`Error! Check ToS;DR logs: ${err}`);
    })
  }, [api, store, annotation, pointLinks, setPointLinks])

  useEffect(() => {
    fetchPointLinks();
  }, [fetchPointLinks]);

  const onEdit = () => {    
    store.createDraft(annotation, {
      tags: annotation.tags,
      text: annotation.text,
      isPrivate: isPrivate(annotation.permissions),
    });
  };

  const onFlag = () => {
    annotationsService
      .flag(annotation)
      .catch(() => toastMessenger.error('Flagging annotation failed'));
  };

  const onReplyClick = () => {
    if (!isLoggedIn) {
      store.openSidebarPanel('loginPrompt');
      return;
    }
    onReply();
  };

  return (
    <div>
      <div className="flex text-[16px]" data-testid="annotation-action-bar">
        {showEditAction && (
          <IconButton icon={EditIcon} title="Edit" onClick={onEdit} />
        )}
        {showDeleteAction && (
          <IconButton icon={TrashIcon} title="Delete" onClick={onDelete} />
        )}
        {/* <IconButton icon={ReplyIcon} title="Reply" onClick={onReplyClick} />
        {shareLink && (
          <AnnotationShareControl annotation={annotation} shareUri={shareLink} />
        )} */}
        {/* {showFlagAction && !annotation.flagged && (
          <IconButton
            icon={FlagIcon}
            title="Report this annotation to moderators"
            onClick={onFlag}
          />
        )} */}
        {/* {showFlagAction && annotation.flagged && (
          <IconButton
            pressed={true}
            icon={FlagFilledIcon}
            title="Annotation has been reported to the moderators"
          />
        )} */}
      </div>
      <div>
        {pointLinks && (
          <div>
            <Link
              color="text-light"
              href={pointLinks[annotation.id]}
              lang=""
              target="_blank"
              aria-label={`Point: ${annotation.id}`}
              title={'View point in Phoenix'}
              >
                View point page
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default withServices(AnnotationActionBar, [
  'annotationsService',
  'settings',
  'toastMessenger',
  'api'
]);
