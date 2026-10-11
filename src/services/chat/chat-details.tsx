// import { useState, useCallback, useEffect, useRef } from "react";
// import { ACTIONS } from "@/store/types";
// import { useDataContext } from "@/store/useDataContext";
// import { GetRequest } from "@/utils/requests";
// import { useFocusEffect } from "@react-navigation/native";

// interface Props {
//     channel_id: string;
// }

// const UseChatDetails = ({ channel_id }: Props) => {
//     const { state, dispatch } = useDataContext();
//     const [page, setPage] = useState(1);
//     const [isFetchingMore, setIsFetchingMore] = useState(false);
//     const [hasMore, setHasMore] = useState(true);

//     useFocusEffect(
//         useCallback(() => {
//             const getChat = async () => {
//                 const { data, error } = await GetRequest(`/dms/channels/${channel_id}/threads?page=1&limit=50`);
//                 if (!error && data?.data) {
//                     dispatch({
//                         type: ACTIONS.DMS_CHAT, payload: {
//                             data: data.data,
//                             page: 1
//                         }
//                     });
//                     setPage(1);
//                 }
//             }

//             getChat();
//         }, [channel_id, dispatch, state?.callback])
//     );

//     const loadMore = useCallback(async () => {
//         if (isFetchingMore || !hasMore || state?.dmsChat?.length < 50) return;

//         setIsFetchingMore(true);
//         const nextPage = page + 1;

//         try {
//             const { data, error } = await GetRequest(
//                 `/dms/channels/${channel_id}/threads?page=${nextPage}&limit=50`
//             );

//             if (!error && data?.data) {
//                 const freshMessages = data.data;
//                 const paginationDetails = data.pagination[0];

//                 dispatch({
//                     type: ACTIONS.DMS_CHAT,
//                     payload: {
//                         data: freshMessages,
//                         page: nextPage
//                     }
//                 });

//                 setPage(nextPage);

//                 if (nextPage >= (paginationDetails?.total_pages_count || 0)) {
//                     setHasMore(false);
//                 }
//             } else {
//                 setHasMore(false);
//             }
//         } catch (err) {
//             console.error(err);
//         } finally {
//             setIsFetchingMore(false);
//         }
//     }, [channel_id, page, isFetchingMore, hasMore, dispatch]);

//     return { loadMore, isFetchingMore };
// };

// export default UseChatDetails;

import { useState, useCallback, useLayoutEffect, useRef } from 'react';
import { ACTIONS } from '@/store/types';
import { useDataContext } from '@/store/useDataContext';
import { GetRequest } from '@/utils/requests';
import { useFocusEffect } from '@react-navigation/native';

interface Props {
  channel_id: string;
  preserveHistoryOnRefresh?: boolean;
}

const createSession = (roomId: string) => ({
  roomId,
  page: 1,
  hasMore: true,
  initialized: false,
  fetchingMore: false,
  refreshId: 0,
});

const UseChatDetails = ({
  channel_id,
  preserveHistoryOnRefresh = false,
}: Props) => {
  const { state, dispatch } = useDataContext();
  const session = useRef(createSession(channel_id));
  const currentRoom = useRef(channel_id);
  const bufferOwner = useRef(state.dmsChatRoomId);
  useLayoutEffect(() => {
    currentRoom.current = channel_id;
    bufferOwner.current = state.dmsChatRoomId;
  }, [channel_id, state.dmsChatRoomId]);
  const isFocusedRef = useRef(false);
  const [status, setStatus] = useState({
    roomId: channel_id,
    ready: false,
    initialLoading: true,
    fetchingMore: false,
  });

  // A new focus cannot reuse a global buffer replaced by another stacked screen.
  useFocusEffect(
    useCallback(() => {
      session.current = createSession(channel_id);
      isFocusedRef.current = true;
      setStatus({
        roomId: channel_id,
        ready: false,
        initialLoading: true,
        fetchingMore: false,
      });
      return () => {
        isFocusedRef.current = false;
        session.current = createSession(channel_id);
      };
    }, [channel_id]),
  );

  const fetchPage1 = useCallback(async () => {
    const room = session.current;
    const requestId = ++room.refreshId;
    const isCurrent = () =>
      session.current === room &&
      currentRoom.current === channel_id &&
      room.refreshId === requestId;
    if (!room.initialized) {
      setStatus(previous => ({ ...previous, initialLoading: true }));
    }
    try {
      const { data, error } = await GetRequest(
        `/dms/channels/${channel_id}/threads?page=1&limit=50`,
      );
      if (!isCurrent() || !isFocusedRef.current) return;
      if (!error && Array.isArray(data?.data)) {
        const preserveHistory =
          preserveHistoryOnRefresh &&
          room.initialized &&
          bufferOwner.current === channel_id;
        dispatch({
          type: ACTIONS.DMS_CHAT,
          payload: {
            data: data.data,
            page: 1,
            preserveHistory,
            roomId: channel_id,
          },
        });
        if (!preserveHistory) room.page = 1;
        room.initialized = true;
        const totalPages = data.pagination?.[0]?.total_pages_count;
        if (!preserveHistory || totalPages != null) {
          room.hasMore =
            totalPages != null
              ? room.page < totalPages
              : data.data.length >= 50;
        }
        setStatus(previous => ({
          ...previous,
          roomId: channel_id,
          ready: true,
        }));
      }
    } finally {
      if (isCurrent()) {
        setStatus(previous => ({ ...previous, initialLoading: false }));
      }
    }
  }, [channel_id, dispatch, preserveHistoryOnRefresh]);

  useFocusEffect(
    useCallback(() => {
      fetchPage1();
    }, [fetchPage1, state?.callback]),
  );

  const loadMore = useCallback(async () => {
    const room = session.current;
    if (
      !isFocusedRef.current ||
      !room.initialized ||
      (preserveHistoryOnRefresh && bufferOwner.current !== channel_id) ||
      room.fetchingMore ||
      !room.hasMore ||
      state?.dmsChat?.length < 50
    )
      return;

    room.fetchingMore = true;
    setStatus(previous => ({ ...previous, fetchingMore: true }));
    const nextPage = room.page + 1;
    const isCurrent = () =>
      session.current === room && currentRoom.current === channel_id;
    try {
      const { data, error } = await GetRequest(
        `/dms/channels/${channel_id}/threads?page=${nextPage}&limit=50`,
      );
      if (
        !isCurrent() ||
        !isFocusedRef.current ||
        (preserveHistoryOnRefresh && bufferOwner.current !== channel_id)
      )
        return;
      if (!error && Array.isArray(data?.data)) {
        dispatch({
          type: ACTIONS.DMS_CHAT,
          payload: { data: data.data, page: nextPage },
        });
        room.page = nextPage;
        const totalPages = data.pagination?.[0]?.total_pages_count;
        room.hasMore =
          totalPages != null ? nextPage < totalPages : data.data.length >= 50;
      }
    } finally {
      room.fetchingMore = false;
      if (isCurrent()) {
        setStatus(previous => ({ ...previous, fetchingMore: false }));
      }
    }
  }, [channel_id, dispatch, preserveHistoryOnRefresh, state?.dmsChat]);

  const isCurrentStatus = status.roomId === channel_id;
  return {
    loadMore,
    isFetchingMore: isCurrentStatus && status.fetchingMore,
    isInitialLoading: !isCurrentStatus || status.initialLoading,
    isConversationReady:
      isCurrentStatus &&
      status.ready &&
      (!preserveHistoryOnRefresh || state.dmsChatRoomId === channel_id),
  };
};

export default UseChatDetails;
