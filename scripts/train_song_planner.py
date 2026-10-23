#!/usr/bin/env python3
"""Pinned Qwen3 research training with full context and chunked vocabulary loss."""
import functools
import json
import mlx.core as mx
import mlx.nn as nn


def song_loss(model,batch,lengths):
    if model.model_type!='qwen3':raise ValueError('Chunked song loss is qualified for Qwen3 only')
    hidden=model.model(batch[:,:-1]);targets=batch[:,1:]
    steps=mx.arange(1,targets.shape[1]+1)
    mask=mx.logical_and(steps>=lengths[:,0:1],steps<=lengths[:,1:])
    head=model.model.embed_tokens if model.args.tie_word_embeddings else model.lm_head
    parameters=head.trainable_parameters()
    # Recompute vocabulary logits per chunk during backward; retain the complete song context.
    @mx.checkpoint
    def loss_chunk(parameters,h,t,m):
        head.update(parameters)
        logits=head.as_linear(h) if model.args.tie_word_embeddings else head(h)
        return (nn.losses.cross_entropy(logits,t)*m).astype(mx.float32).sum()
    loss=mx.array(0.,dtype=mx.float32)
    for start in range(0,targets.shape[1],128):
        loss=loss+loss_chunk(parameters,hidden[:,start:start+128],targets[:,start:start+128],mask[:,start:start+128])
    head.update(parameters)
    tokens=mask.sum()
    return loss/tokens,tokens


def main():
    from mlx_lm import lora
    from mlx_lm.tuner import trainer
    mx.set_cache_limit(256*1024**2)
    mx.set_memory_limit(8*1024**3)
    original=mx.set_wired_limit
    mx.set_wired_limit=lambda limit:original(min(limit,6*1024**3))
    lora.train=functools.partial(trainer.train,loss=song_loss)
    lora.evaluate=functools.partial(trainer.evaluate,loss=song_loss)
    try:lora.main()
    finally:print(json.dumps({'peak_metal_bytes':mx.get_peak_memory(),'vocabulary_chunk_tokens':128,'full_context':True}),flush=True)


if __name__=='__main__':main()
