import {afterEach, beforeEach, describe, expect, test, it, jest} from '@jest/globals';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import {Context} from '@actions/github/lib/context';
import {Git} from '@docker/actions-toolkit/lib/git';
import {GitHub} from '@docker/actions-toolkit/lib/github';

import {ContextSource, getContext, getInputs, Inputs} from '../src/context';

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(GitHub, 'context', 'get').mockImplementation((): Context => {
    return new Context();
  });
});

describe('getInputs', () => {
  beforeEach(() => {
    process.env = Object.keys(process.env).reduce((object, key) => {
      if (!key.startsWith('INPUT_')) {
        object[key] = process.env[key];
      }
      return object;
    }, {});
  });

  // prettier-ignore
  test.each([
    [
      0,
      new Map<string, string>([
        ['images', 'moby/buildkit\nghcr.io/moby/mbuildkit'],
      ]),
      {
        context: ContextSource.workflow,
        bakeTarget: 'docker-metadata-action',
        flavor: [],
        githubToken: '',
        images: ['moby/buildkit', 'ghcr.io/moby/mbuildkit'],
        labels: [],
        sepLabels: '\n',
        sepTags: '\n',
        tags: [],
      } as Inputs
    ],
    [
      1,
      new Map<string, string>([
        ['bake-target', 'metadata'],
        ['images', 'moby/buildkit'],
        ['sep-labels', ','],
        ['sep-tags', ','],
      ]),
      {
        context: ContextSource.workflow,
        bakeTarget: 'metadata',
        flavor: [],
        githubToken: '',
        images: ['moby/buildkit'],
        labels: [],
        sepLabels: ',',
        sepTags: ',',
        tags: [],
      } as Inputs
    ],
    [
      2,
      new Map<string, string>([
        ['images', 'moby/buildkit\n#comment\nghcr.io/moby/mbuildkit'],
      ]),
      {
        context: ContextSource.workflow,
        bakeTarget: 'docker-metadata-action',
        flavor: [],
        githubToken: '',
        images: ['moby/buildkit', 'ghcr.io/moby/mbuildkit'],
        labels: [],
        sepLabels: '\n',
        sepTags: '\n',
        tags: [],
      } as Inputs
    ],
  ])(
    '[%d] given %p as inputs, returns %p',
    async (num: number, inputs: Map<string, string>, expected: Inputs) => {
      inputs.forEach((value: string, name: string) => {
        setInput(name, value);
      });
      expect(await getInputs()).toEqual(expected);
    }
  );
});

describe('getContext', () => {
  const originalEnv = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      ...dotenv.parse(fs.readFileSync(path.join(__dirname, 'fixtures/event_create_branch.env')))
    };
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  it('workflow', async () => {
    const context = await getContext(ContextSource.workflow);
    expect(context.ref).toEqual('refs/heads/dev');
    expect(context.sha).toEqual('5f3331d7f7044c18ca9f12c77d961c4d7cf3276a');
  });

  it('git', async () => {
    jest.spyOn(Git, 'context').mockImplementation((): Promise<Context> => {
      return Promise.resolve({
        ref: 'refs/heads/git-test',
        sha: 'git-test-sha'
      } as Context);
    });
    const context = await getContext(ContextSource.git);
    expect(context.ref).toEqual('refs/heads/git-test');
    expect(context.sha).toEqual('git-test-sha');
  });
});

// See: https://github.com/actions/toolkit/blob/master/packages/core/src/core.ts#L67
function getInputName(name: string): string {
  return `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
}

function setInput(name: string, value: string): void {
  process.env[getInputName(name)] = value;
}
