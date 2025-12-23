'use client';

import React, { useState, useEffect } from 'react';
import { Joke, JokeComment } from '@/lib/types';
import { getJokesAction, addCommentAction, voteJokeAction } from '@/app/actions';
import { MessageSquare, User, Clock, Send, Laugh, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from './ui/Button';
import posthog from 'posthog-js';

export const JokeWall: React.FC = () => {
  const [jokes, setJokes] = useState<Joke[]>([]);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});

  const fetchJokes = async () => {
    const fetchedJokes = await getJokesAction();
    // Sort by score descending, then by timestamp descending
    const sorted = [...fetchedJokes].sort((a, b) => {
      if ((b.score || 0) !== (a.score || 0)) {
        return (b.score || 0) - (a.score || 0);
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    setJokes(sorted);
  };

  useEffect(() => {
    fetchJokes();
    // Poll for new jokes every 10 seconds
    const interval = setInterval(fetchJokes, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleVote = async (jokeId: string, delta: number) => {
    const joke = jokes.find(j => j.id === jokeId);

    // Track joke_wall_vote with PostHog
    posthog.capture('joke_wall_vote', {
      joke_id: jokeId,
      model_signature: joke?.modelSignature,
      vote_direction: delta > 0 ? 'upvote' : 'downvote',
      current_score: joke?.score || 0,
      new_score: (joke?.score || 0) + delta,
    });

    // Optimistic update
    setJokes(prev => prev.map(j =>
      j.id === jokeId ? { ...j, score: (j.score || 0) + delta } : j
    ).sort((a, b) => (b.score || 0) - (a.score || 0)));

    await voteJokeAction(jokeId, delta);
    fetchJokes(); // Refresh to sync with server
  };

  const handleAddComment = async (jokeId: string) => {
    const text = commentTexts[jokeId];
    if (!text?.trim()) return;

    const joke = jokes.find(j => j.id === jokeId);

    const newComment: JokeComment = {
      id: Date.now().toString(),
      text: text.trim(),
      timestamp: new Date().toISOString(),
      author: 'User'
    };

    // Track joke_wall_comment with PostHog
    posthog.capture('joke_wall_comment', {
      joke_id: jokeId,
      model_signature: joke?.modelSignature,
      comment_length: text.trim().length,
      total_comments: (joke?.comments.length || 0) + 1,
    });

    await addCommentAction(jokeId, newComment);
    setCommentTexts(prev => ({ ...prev, [jokeId]: '' }));
    fetchJokes();
  };

  return (
    <div className="h-full flex flex-col bg-mocha-mantle border-r border-mocha-surface1 w-80 overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-mocha-surface1 bg-mocha-crust">
        <h2 className="text-xl font-black text-mocha-blue flex items-center gap-2 uppercase tracking-tighter">
          <Laugh className="w-6 h-6" />
          Joke Wall
        </h2>
        <p className="text-xs text-mocha-subtext1 font-medium mt-1 uppercase tracking-widest opacity-70">
          The Hall of LLM Fame
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {jokes.length > 0 ? (
          jokes.map((joke) => (
            <div key={joke.id} className="bg-mocha-surface0 rounded-xl border border-mocha-surface1 shadow-sm hover:border-mocha-blue/30 transition-colors group flex overflow-hidden">
              {/* Voting Side Pillar */}
              <div className="w-10 bg-mocha-crust/30 flex flex-col items-center py-2 border-r border-mocha-surface1/30">
                <button 
                  onClick={() => handleVote(joke.id, 1)}
                  className="p-1 text-mocha-subtext0 hover:text-mocha-blue transition-colors"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
                <span className="text-xs font-black text-mocha-text my-1">
                  {joke.score || 0}
                </span>
                <button 
                  onClick={() => handleVote(joke.id, -1)}
                  className="p-1 text-mocha-subtext0 hover:text-mocha-red transition-colors"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>

              {/* Joke Content */}
              <div className="flex-1 p-4">
                <div className="text-mocha-text text-sm italic mb-4 leading-relaxed font-serif">
                  "{joke.content}"
                </div>
                
                <div className="flex flex-col gap-1 mb-4 border-l-2 border-mocha-blue/30 pl-3">
                  <div className="text-[10px] font-black text-mocha-blue uppercase tracking-tighter flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {joke.modelSignature}
                  </div>
                  <div className="text-[10px] text-mocha-subtext0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(joke.timestamp).toLocaleDateString()}
                  </div>
                </div>

                {/* Comments Section */}
                <div className="space-y-2 pt-3 border-t border-mocha-surface1/50">
                  {joke.comments.map((comment) => (
                    <div key={comment.id} className="text-[10px] text-mocha-subtext1 bg-mocha-crust/50 rounded-lg p-2 leading-tight">
                      <span className="font-bold text-mocha-lavender">{comment.author}:</span> {comment.text}
                    </div>
                  ))}
                  
                  <div className="flex gap-1.5 mt-2">
                    <input
                      type="text"
                      placeholder="Comment..."
                      className="flex-1 bg-mocha-crust border border-mocha-surface1 rounded px-2 py-1 text-[10px] text-mocha-text focus:outline-none focus:ring-1 focus:ring-mocha-blue"
                      value={commentTexts[joke.id] || ''}
                      onChange={(e) => setCommentTexts(prev => ({ ...prev, [joke.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddComment(joke.id);
                      }}
                    />
                    <button
                      onClick={() => handleAddComment(joke.id)}
                      className="p-1 bg-mocha-blue text-mocha-base rounded hover:bg-mocha-blue/90 transition-colors"
                    >
                      <Send className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-mocha-surface2 italic text-sm text-center px-4 space-y-2">
             <div className="w-12 h-12 rounded-full border-2 border-dashed border-mocha-surface1 flex items-center justify-center mb-2">
               <Laugh className="w-6 h-6 opacity-20" />
             </div>
             <p>No jokes on the wall yet.</p>
             <p className="text-[10px] uppercase tracking-widest opacity-50">Rate a joke as "funny" to add it here!</p>
          </div>
        )}
      </div>
    </div>
  );
};


