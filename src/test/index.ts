import * as path from 'path';
import * as Mocha from 'mocha';
import * as fs from 'fs';

export function run(): Promise<void> {
    const mocha = new Mocha({
        ui: 'tdd',
        color: true
    });

    const testsRoot = path.resolve(__dirname, '.');

    return new Promise((resolve, reject) => {
        fs.readdir(testsRoot, (err, files) => {
            if (err) {
                return reject(err);
            }

            const testFiles = files.filter(f => f.endsWith('.test.js'));
            testFiles.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

            try {
                mocha.run(failures => {
                    if (failures > 0) {
                        reject(new Error(`${failures} tests failed.`));
                    } else {
                        resolve();
                    }
                });
            } catch (e) {
                reject(e);
            }
        });
    });
}
