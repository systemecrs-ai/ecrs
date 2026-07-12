import { useState, useEffect, useRef } from 'react';

export function useSmoothStream(messages: any[], isStreaming: boolean) {
  const [displayedMessages, setDisplayedMessages] = useState<any[]>([]);
  const queueRef = useRef<string>('');
  const displayedContentRef = useRef<string>('');
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (messages.length === 0) {
      setDisplayedMessages([]);
      return;
    }

    const newDisplayed = [...messages];
    
    if (isStreaming && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        const fullContent = lastMessage.content || '';
        
        // If it's a new message starting to stream, reset the refs
        if (newDisplayed.length > displayedMessages.length) {
          queueRef.current = fullContent;
          displayedContentRef.current = '';
        } else {
          // Calculate the new characters to add to the queue
          const currentDisplayedFull = messages[messages.length - 1].content || '';
          if (currentDisplayedFull.length > queueRef.current.length) {
             queueRef.current = currentDisplayedFull;
          }
        }

        // Replace the last message's content with our currently displayed content
        newDisplayed[newDisplayed.length - 1] = {
          ...lastMessage,
          content: displayedContentRef.current,
        };
      }
    } else if (!isStreaming && messages.length > 0) {
      // Ensure the last message is fully displayed when streaming stops
       const lastMessage = messages[messages.length - 1];
       if (lastMessage.role === 'assistant' && lastMessage.content !== displayedContentRef.current) {
          displayedContentRef.current = lastMessage.content || '';
          queueRef.current = lastMessage.content || '';
       }
    }

    setDisplayedMessages(newDisplayed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isStreaming]);

  useEffect(() => {
    if (!isStreaming && queueRef.current === displayedContentRef.current) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const updateDisplay = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const deltaTime = time - lastTimeRef.current;
      
      // Randomize delay between 15ms and 25ms
      const delay = Math.random() * 10 + 15;

      if (deltaTime > delay) {
        if (displayedContentRef.current.length < queueRef.current.length) {
          displayedContentRef.current = queueRef.current.substring(0, displayedContentRef.current.length + 1);
          
          setDisplayedMessages((prev) => {
            if (prev.length === 0) return prev;
            const newPrev = [...prev];
            const lastIdx = newPrev.length - 1;
            if (newPrev[lastIdx].role === 'assistant') {
              newPrev[lastIdx] = { ...newPrev[lastIdx], content: displayedContentRef.current };
            }
            return newPrev;
          });
        }
        lastTimeRef.current = time;
      }

      if (isStreaming || displayedContentRef.current.length < queueRef.current.length) {
        animationFrameRef.current = requestAnimationFrame(updateDisplay);
      }
    };

    if (isStreaming || displayedContentRef.current.length < queueRef.current.length) {
      animationFrameRef.current = requestAnimationFrame(updateDisplay);
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isStreaming]);

  return displayedMessages;
}
