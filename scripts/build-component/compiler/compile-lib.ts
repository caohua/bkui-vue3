/*
* Tencent is pleased to support the open source community by making
* 蓝鲸智云PaaS平台社区版 (BlueKing PaaS Community Edition) available.
*
* Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
*
* 蓝鲸智云PaaS平台社区版 (BlueKing PaaS Community Edition) is licensed under the MIT License.
*
* License for 蓝鲸智云PaaS平台社区版 (BlueKing PaaS Community Edition):
*
* ---------------------------------------------------
* Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
* documentation files (the "Software"), to deal in the Software without restriction, including without limitation
* the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
* to permit persons to whom the Software is furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all copies or substantial portions of
* the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
* THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
* CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
* IN THE SOFTWARE.
*/

import { createReadStream, createWriteStream, lstatSync, readdirSync, readFileSync, rmdirSync, writeFileSync } from 'fs';
import { join, parse, resolve } from 'path';

import { ITaskItem } from '../typings/task';

import { COMPONENT_URL, DIST_URL } from './helpers';

// 编译转换*.d.ts
export const compilerLibDir = async (dir: string): Promise<any> => {
  const buildDir: any = (dir: string) => {
    const files = readdirSync(dir);
    const list = files.filter(url =>  /\.d.ts$/.test(join(dir, url)));
    (list.length ? list : files).forEach((file, index) => {
      const url = join(dir, file);
      if (list.length) {
        if (/lib\/(bkui-vue|styles\/src)\/(components|index)\.d\.ts$/.test(url)) {
          let chunck = readFileSync(url, 'utf-8');
          chunck = chunck.replace(/@bkui-vue/gmi, url.match(/styles\/src\/index.d.ts$/) ? '..' : '.');
          writeFileSync(url, chunck);
        }
        moveFile(url, resolve(parse(url).dir, '../', parse(url).base))
          .then(() => {
            if (index === list.length - 1) {
              rmdirSync(parse(url).dir, { recursive: true });
            }
          })
          .catch(console.error);
      } else if (lstatSync(url).isDirectory()) {
        buildDir(url);
      }
    });
  };
  buildDir(dir);
};

// move file
export const moveFile = (oldPath, newPath) => new Promise((resolve, reject) => {
  const readStream = createReadStream(oldPath);
  const writeStream = createWriteStream(newPath);
  readStream.on('error', err => reject(err));
  writeStream.on('error', err => reject(err));
  writeStream.on('close', () => {
    resolve(undefined);
  });
  readStream.pipe(writeStream);
});

export const compileFile = (url: string): ITaskItem => {
  if (/\/dist\/|\.DS_Store|\.bak|bkui-vue\/index/.test(url)) {
    return;
  }
  const newPath = url.replace(new RegExp(`${COMPONENT_URL}/([^/]+)/src`), `${DIST_URL}/$1`);
  if (/\.(css|less|scss)$/.test(url) && !/\.variable.(css|less|scss)$/.test(url)) {
    return {
      type: 'style',
      url,
      newPath,
    };
  } if (/\/src\/index\.(js|ts|jsx|tsx)$/.test(url)) {
    return {
      type: 'script',
      url,
      newPath,
    };
  }
  if (/\/icon\/icons\/[^.]+\.(js|ts|jsx|tsx)$/.test(url)) {
    return {
      type: 'script',
      url,
      newPath: url.replace(new RegExp(`${COMPONENT_URL}/([^/]+)/icons`), `${DIST_URL}/$1`),
    };
  }
  return;
};